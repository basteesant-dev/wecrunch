"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ActionForm";
import { fromLocalInput } from "@/components/admin/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { emptyValues } from "@/lib/fields";
import { fieldsSchema, formatZodError } from "@/lib/fields-schema";
import { publishPage, rollbackTo, unpublishPage } from "@/lib/pages";
import { revalidateCms } from "@/lib/revalidate";
import { SECTION_SETTINGS_FIELDS, SECTION_TYPES, isSectionType } from "@/lib/sections/registry";
import { sectionKeySchema, validateSection } from "@/lib/sections/validate";
import type { Prisma } from "@/generated/prisma/client";
import { PAGE_FIELDS } from "./fields";

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED = new Set(["admin", "api", "media", "_next", "sitemap.xml", "robots.txt"]);

async function slugProblem(slug: string, pageId: string | null) {
  if (!SLUG.test(slug)) return "Slug may only contain lowercase letters, numbers and single dashes.";
  if (RESERVED.has(slug)) return `"${slug}" is reserved.`;
  const page = await db.page.findUnique({ where: { slug }, select: { id: true } });
  if (page && page.id !== pageId) return `Another page already uses /${slug}.`;
  return null;
}

export async function createPage(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const title = String(fd.get("title") ?? "").trim();
  const slug = String(fd.get("slug") ?? "").trim().toLowerCase();
  if (!title) return { error: "Enter a title." };
  const problem = await slugProblem(slug, null);
  if (problem) return { error: problem };
  const page = await db.page.create({ data: { title, slug, createdById: user.id, updatedById: user.id } });
  await audit(user, "page.create", { entityType: "Page", entityId: page.id, summary: title });
  redirect(`/admin/pages/${page.id}`);
}

export async function duplicatePage(pageId: string) {
  const user = await requireUser("content.manage");
  const src = await db.page.findUniqueOrThrow({ where: { id: pageId }, include: { sections: { include: { states: { select: { id: true } } } } } });
  let slug = `${src.slug}-copy`;
  for (let n = 2; await db.page.findUnique({ where: { slug } }); n++) slug = `${src.slug}-copy-${n}`;
  const copy = await db.$transaction(async (tx) => {
    const { id: _id, createdAt: _c, updatedAt: _u, sections, status: _s, ...rest } = src;
    const page = await tx.page.create({ data: { ...rest, slug, title: `${src.title} (copy)`, status: "DRAFT", createdById: user.id, updatedById: user.id } });
    for (const s of sections) {
      await tx.pageSection.create({
        data: { pageId: page.id, type: s.type, key: s.key, sortOrder: s.sortOrder, isHidden: s.isHidden, content: s.content as Prisma.InputJsonValue, settings: s.settings as Prisma.InputJsonValue, states: { connect: s.states } },
      });
    }
    return page;
  });
  await audit(user, "page.duplicate", { entityType: "Page", entityId: copy.id, summary: `${src.title} → ${copy.slug}` });
  redirect(`/admin/pages/${copy.id}`);
}

export async function deletePage(pageId: string): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const page = await db.page.findUniqueOrThrow({ where: { id: pageId }, include: { states: { select: { name: true } } } });
  if (page.slug === "home") return { error: "The home page cannot be deleted. Unpublish it instead." };
  if (page.states.length) return { error: `Used as the landing page for ${page.states.map((s) => s.name).join(", ")}. Change those states first.` };
  await db.page.delete({ where: { id: pageId } });
  await audit(user, "page.delete", { entityType: "Page", entityId: pageId, summary: page.title });
  revalidateCms();
  redirect("/admin/pages?deleted=1");
}

export async function savePageMeta(pageId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const parsed = fieldsSchema(PAGE_FIELDS).safeParse(JSON.parse(String(fd.get("values") ?? "{}")));
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const v = parsed.data as Record<string, string | boolean>;
  const current = await db.page.findUniqueOrThrow({ where: { id: pageId }, select: { slug: true } });
  const slug = String(v.slug).toLowerCase();
  if (current.slug === "home" && slug !== "home") return { error: "The home page's slug must stay \"home\"." };
  const problem = await slugProblem(slug, pageId);
  if (problem) return { error: problem };
  const n = (x: unknown) => (x ? String(x) : null);
  await db.page.update({
    where: { id: pageId },
    data: {
      title: String(v.title),
      slug,
      seoTitle: n(v.seoTitle),
      seoDescription: n(v.seoDescription),
      ogImageId: n(v.ogImageId),
      canonicalUrl: n(v.canonicalUrl),
      noIndex: !!v.noIndex,
      phone: n(v.phone),
      whatsapp: n(v.whatsapp),
      email: n(v.email),
      updatedById: user.id,
    },
  });
  await audit(user, "page.update_settings", { entityType: "Page", entityId: pageId, summary: String(v.title) });
  if (slug !== current.slug) revalidateCms(); // URL changes apply immediately
  refresh();
  return { ok: true, message: current.slug !== slug ? "Saved. The page URL changed immediately; other changes go live when you publish." : "Saved to draft. Publish to make it live." };
}

async function touch(pageId: string, userId: string) {
  await db.page.update({ where: { id: pageId }, data: { updatedById: userId, updatedAt: new Date() } });
}

async function renumber(pageId: string) {
  const sections = await db.pageSection.findMany({ where: { pageId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  await db.$transaction(sections.map((s, i) => db.pageSection.update({ where: { id: s.id }, data: { sortOrder: i } })));
}

export async function addSection(pageId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const type = String(fd.get("type") ?? "");
  if (!isSectionType(type)) return { error: "Choose a section type." };
  const count = await db.pageSection.count({ where: { pageId } });
  const section = await db.pageSection.create({
    data: {
      pageId,
      type,
      sortOrder: count,
      content: emptyValues(SECTION_TYPES[type].fields) as Prisma.InputJsonValue,
      settings: emptyValues(SECTION_SETTINGS_FIELDS(type)) as Prisma.InputJsonValue,
    },
  });
  await touch(pageId, user.id);
  await audit(user, "section.create", { entityType: "PageSection", entityId: section.id, summary: type });
  redirect(`/admin/pages/${pageId}/sections/${section.id}`);
}

export async function moveSection(pageId: string, sectionId: string, dir: -1 | 1) {
  const user = await requireUser("content.manage");
  await renumber(pageId);
  const list = await db.pageSection.findMany({ where: { pageId }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const i = list.findIndex((s) => s.id === sectionId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  await db.$transaction([
    db.pageSection.update({ where: { id: list[i].id }, data: { sortOrder: j } }),
    db.pageSection.update({ where: { id: list[j].id }, data: { sortOrder: i } }),
  ]);
  await touch(pageId, user.id);
  refresh();
}

export async function duplicateSection(pageId: string, sectionId: string) {
  const user = await requireUser("content.manage");
  const s = await db.pageSection.findUniqueOrThrow({ where: { id: sectionId }, include: { states: { select: { id: true } } } });
  await db.pageSection.updateMany({ where: { pageId, sortOrder: { gt: s.sortOrder } }, data: { sortOrder: { increment: 1 } } });
  const copy = await db.pageSection.create({
    data: { pageId, type: s.type, key: s.key, sortOrder: s.sortOrder + 1, isHidden: s.isHidden, content: s.content as Prisma.InputJsonValue, settings: s.settings as Prisma.InputJsonValue, states: { connect: s.states } },
  });
  await touch(pageId, user.id);
  await audit(user, "section.duplicate", { entityType: "PageSection", entityId: copy.id, summary: s.type });
  refresh();
}

export async function toggleSection(pageId: string, sectionId: string) {
  const user = await requireUser("content.manage");
  const s = await db.pageSection.findUniqueOrThrow({ where: { id: sectionId }, select: { isHidden: true } });
  await db.pageSection.update({ where: { id: sectionId }, data: { isHidden: !s.isHidden } });
  await touch(pageId, user.id);
  await audit(user, s.isHidden ? "section.show" : "section.hide", { entityType: "PageSection", entityId: sectionId });
  refresh();
}

export async function deleteSection(pageId: string, sectionId: string) {
  const user = await requireUser("content.manage");
  await db.pageSection.delete({ where: { id: sectionId } });
  await renumber(pageId);
  await touch(pageId, user.id);
  await audit(user, "section.delete", { entityType: "PageSection", entityId: sectionId });
  refresh();
}

export async function saveSection(pageId: string, sectionId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const section = await db.pageSection.findUniqueOrThrow({ where: { id: sectionId }, select: { type: true } });
  let content: unknown, settings: unknown, scope: { key?: string; stateIds?: string[] };
  try {
    content = JSON.parse(String(fd.get("content")));
    settings = JSON.parse(String(fd.get("settings")));
    scope = JSON.parse(String(fd.get("scope")));
  } catch {
    return { error: "The form data could not be read." };
  }
  const v = validateSection(section.type, content, settings);
  if (!v.ok) return { error: v.error };
  const key = sectionKeySchema.safeParse(scope.key ?? "");
  if (!key.success) return { error: key.error.issues[0].message };
  const stateIds = Array.isArray(scope.stateIds) ? scope.stateIds.filter((s): s is string => typeof s === "string") : [];
  const valid = await db.state.findMany({ where: { id: { in: stateIds } }, select: { id: true } });
  await db.pageSection.update({
    where: { id: sectionId },
    data: {
      content: v.content as Prisma.InputJsonValue,
      settings: v.settings as Prisma.InputJsonValue,
      key: key.data || null,
      states: { set: valid.map((s) => ({ id: s.id })) },
    },
  });
  await touch(pageId, user.id);
  await audit(user, "section.update", { entityType: "PageSection", entityId: sectionId, summary: section.type });
  return { ok: true, message: "Saved to draft. Preview it, then publish the page to make it live." };
}

export async function publish(pageId: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const publishAt = fromLocalInput(String(fd.get("publishAt") ?? ""));
  const note = String(fd.get("note") ?? "").slice(0, 300) || undefined;
  const result = await publishPage(pageId, user.id, { publishAt, note });
  if (!result.ok) return { error: `Fix these sections before publishing:\n${result.errors.join("\n")}` };
  await audit(user, result.scheduled ? "page.schedule" : "page.publish", {
    entityType: "Page",
    entityId: pageId,
    summary: `v${result.revision.version}${publishAt ? ` at ${publishAt.toISOString()}` : ""}`,
  });
  if (!result.scheduled) revalidateCms();
  refresh();
  return { ok: true, message: result.scheduled ? `Scheduled version ${result.revision.version}.` : `Published version ${result.revision.version}. It is live now.` };
}

export async function unpublish(pageId: string): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const page = await db.page.findUniqueOrThrow({ where: { id: pageId }, select: { slug: true } });
  if (page.slug === "home") return { error: "The home page cannot be taken offline." };
  await unpublishPage(pageId);
  await audit(user, "page.unpublish", { entityType: "Page", entityId: pageId });
  revalidateCms();
  refresh();
  return { ok: true, message: "The page is offline. Its URL now returns 404 (state URLs show the enquiry page)." };
}

export async function rollback(pageId: string, revisionId: string): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const rev = await rollbackTo(revisionId, user.id);
  await audit(user, "page.rollback", { entityType: "Page", entityId: pageId, summary: rev.note ?? "" });
  revalidateCms();
  refresh();
  return { ok: true, message: `${rev.note}: published as version ${rev.version} and copied into the draft.` };
}
