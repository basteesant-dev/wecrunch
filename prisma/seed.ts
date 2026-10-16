// Seeds verified reference content (prisma/seed-data.ts) into an EMPTY database.
//   npm run db:seed            seeds only if there are no pages yet
//   npm run db:seed -- --force wipes CMS content (not enquiries or users) and reseeds
// Admin accounts are never hard-coded: set ADMIN_EMAIL / ADMIN_PASSWORD and the
// first super admin is created if no admin exists (or use `npm run admin:create`).
import "dotenv/config";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { storeUpload } from "../src/lib/media";
import { publishPage } from "../src/lib/pages";
import { sanitizeRichText } from "../src/lib/sanitize";
import { validateSection } from "../src/lib/sections/validate";
import { fieldsSchema, formatZodError } from "../src/lib/fields-schema";
import { SETTINGS_FIELDS } from "../src/lib/settings-fields";
import { createAdminFromEnv } from "../scripts/create-admin";
import type { Prisma } from "../src/generated/prisma/client";
import { seed } from "./seed-data";

const ASSETS = path.resolve("prisma/seed-assets");
const CONTENT = path.resolve("prisma/seed-content");
const force = process.argv.includes("--force");

const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", mp4: "video/mp4" };

async function main() {
  if ((await db.page.count()) > 0) {
    if (!force) {
      console.log("Content already exists; skipping content seed (use --force to wipe CMS content and reseed).");
      await createAdminFromEnv({ onlyIfNone: true });
      return;
    }
    console.log("--force: removing CMS content (enquiries, users and audit logs are kept)…");
    await db.$transaction([
      db.pageRevision.deleteMany(),
      db.pageSection.deleteMany(),
      db.state.updateMany({ data: { landingPageId: null } }),
      db.page.deleteMany(),
      db.navigationItem.deleteMany(),
      db.navigationMenu.deleteMany(),
      db.galleryItem.deleteMany(),
      db.gallery.deleteMany(),
      db.menuItem.deleteMany(),
      db.menuCategory.deleteMany(),
      db.menu.deleteMany(),
      db.testimonial.deleteMany(),
      db.faq.deleteMany(),
      db.franchiseInvestmentItem.deleteMany(),
      db.franchiseModel.deleteMany(),
      db.redirect.deleteMany(),
      db.siteSetting.deleteMany(),
      db.mediaAsset.deleteMany(),
    ]);
  }

  // ---- media
  const media = new Map<string, string>();
  for (const [name, m] of Object.entries(seed.media)) {
    const file = path.join(ASSETS, m.file);
    if (!(await stat(file).catch(() => null))) {
      console.warn(`  media "${name}" skipped: ${m.file} not found (run tools/fetch-reference-assets.mjs)`);
      continue;
    }
    const ext = m.file.split(".").pop()!.toLowerCase();
    const asset = await storeUpload({ buffer: await readFile(file), type: MIME[ext], filename: m.file, folder: m.folder, alt: m.alt });
    media.set(name, asset.id);
  }
  console.log(`  ${media.size} media assets`);

  // ---- collections
  const forms = new Map<string, string>();
  for (const f of seed.forms) {
    // Forms survive --force (existing enquiries point at them), so upsert.
    const data = { ...f, fields: f.fields as Prisma.InputJsonValue };
    const row = await db.enquiryForm.upsert({ where: { slug: f.slug }, update: data, create: data });
    forms.set(f.slug, row.id);
  }
  const models = new Map<string, string>();
  for (const { breakdown, ...m } of seed.models) {
    const row = await db.franchiseModel.create({
      data: { ...m, breakdown: { create: breakdown.map((b, i) => ({ ...b, sortOrder: i })) } },
    });
    models.set(m.slug, row.id);
  }
  const menus = new Map<string, string>();
  for (const m of seed.menus) {
    const row = await db.menu.create({
      data: {
        name: m.name,
        slug: m.slug,
        description: m.description,
        categories: {
          create: m.categories.map((c, ci) => ({
            name: c.name,
            sortOrder: ci,
            items: { create: c.items.map(([name, price, description], ii) => ({ name, price, description, sortOrder: ii })) },
          })),
        },
      },
    });
    menus.set(m.slug, row.id);
  }
  const galleries = new Map<string, string>();
  for (const g of seed.galleries) {
    const items = g.items.filter((i) => media.has(i.media));
    const row = await db.gallery.create({
      data: { name: g.name, slug: g.slug, items: { create: items.map((i, n) => ({ mediaId: media.get(i.media)!, caption: i.caption, sortOrder: n })) } },
    });
    galleries.set(g.slug, row.id);
  }
  await db.testimonial.createMany({ data: seed.testimonials.map((t, i) => ({ ...t, sortOrder: i })) });
  if (seed.faqs.length) await db.faq.createMany({ data: seed.faqs.map((f, i) => ({ ...f, answer: sanitizeRichText(f.answer), sortOrder: i })) });
  for (const [key, items] of Object.entries(seed.navigation)) {
    await db.navigationMenu.create({
      data: { key, name: key === "header" ? "Header" : "Footer", items: { create: items.map((it, i) => ({ ...it, sortOrder: i })) } },
    });
  }
  if (seed.redirects.length) await db.redirect.createMany({ data: seed.redirects });

  // "@media:x", "@form:x", ... references in seed content become database ids.
  const refs: Record<string, Map<string, string>> = { media, form: forms, model: models, menu: menus, gallery: galleries };
  const link = (value: unknown): unknown => {
    if (typeof value === "string" && value.startsWith("@")) {
      const [kind, name] = value.slice(1).split(":");
      return refs[kind]?.get(name) ?? "";
    }
    if (Array.isArray(value)) return value.map(link).filter((v) => v !== ""); // drop unresolved ids
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, link(v)]));
    return value;
  };

  // ---- settings
  const settings = fieldsSchema(SETTINGS_FIELDS).safeParse(link(seed.settings));
  if (!settings.success) throw new Error(`Invalid seed settings: ${formatZodError(settings.error)}`);
  await db.siteSetting.create({ data: { id: "site", data: settings.data as Prisma.InputJsonValue } });

  // ---- pages (created, then published so they are live)
  const pages = new Map<string, string>();
  for (const p of seed.pages) {
    const page = await db.page.create({
      data: { slug: p.slug, title: p.title, seoTitle: p.seoTitle, seoDescription: p.seoDescription, phone: p.phone, noIndex: p.noIndex ?? false },
    });
    pages.set(p.slug, page.id);
    for (const [i, s] of p.sections.entries()) {
      const content = s.contentFile
        ? { ...s.content, body: await readFile(path.join(CONTENT, s.contentFile), "utf8") }
        : s.content;
      const v = validateSection(s.type, link(content), s.settings ?? {});
      if (!v.ok) throw new Error(`Page ${p.slug}, section ${i + 1} (${s.type}): ${v.error}`);
      await db.pageSection.create({
        data: { pageId: page.id, type: s.type, key: s.key, sortOrder: i, content: v.content as Prisma.InputJsonValue, settings: v.settings as Prisma.InputJsonValue },
      });
    }
    const published = await publishPage(page.id, null, { note: "Initial content from reference website" });
    if (!published.ok) throw new Error(published.errors.join("\n"));
  }
  console.log(`  ${pages.size} pages published`);

  // ---- states (after pages, so landing pages can be linked)
  for (const [i, s] of seed.states.entries()) {
    await db.state.upsert({
      where: { slug: s.slug },
      update: { landingPageId: s.landing ? pages.get(s.landing) : null },
      create: { name: s.name, slug: s.slug, status: s.status, sortOrder: i, landingPageId: s.landing ? pages.get(s.landing) : null },
    });
  }
  console.log(`  ${seed.states.length} states`);

  await createAdminFromEnv({ onlyIfNone: true });
}

main()
  .then(() => console.log("Seed complete."))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
