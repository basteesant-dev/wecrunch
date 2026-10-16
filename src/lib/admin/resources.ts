import { db } from "@/lib/db";
import type { Field, Values } from "@/lib/fields";
import { QUESTION_FIELDS, questionsSchema } from "@/lib/forms";
import type { Prisma } from "@/generated/prisma/client";
import type { StateStatus } from "@/generated/prisma/enums";

// Content modules that share the generic list/edit screens in /admin/[resource].
// Each defines its fields (rendered by FieldsEditor and validated by
// fields-schema) and how values map to and from the database.

type Tx = Prisma.TransactionClient;
/* eslint-disable @typescript-eslint/no-explicit-any */
type V = Record<string, any>;

export type Resource = {
  label: string;
  singular: string;
  description: string;
  columns: string[];
  fields: Field[];
  list(): Promise<{ id: string; cells: string[] }[]>;
  load(id: string): Promise<Values | null>;
  check?(v: V, id: string | null): Promise<string | null>;
  save(tx: Tx, id: string | null, v: V): Promise<string>;
  remove(id: string): Promise<string | null>; // error message when deletion is refused
};

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugField = (help = "Lowercase letters, numbers and dashes"): Field => ({ name: "slug", label: "Slug", type: "text", required: true, help });
const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const yes = (b: boolean) => (b ? "Yes" : "No");

/** Pages, published revisions and settings whose content references an id. */
export async function contentUsage(id: string) {
  const like = `%"${id}"%`;
  const [drafts, live, settings] = await Promise.all([
    db.$queryRaw<{ title: string }[]>`SELECT DISTINCT p.title FROM "PageSection" s JOIN "Page" p ON p.id = s."pageId" WHERE s.content::text LIKE ${like}`,
    db.$queryRaw<{ title: string }[]>`SELECT DISTINCT p.title FROM "PageRevision" r JOIN "Page" p ON p.id = r."pageId" WHERE r.status <> 'SUPERSEDED' AND r.snapshot::text LIKE ${like}`,
    db.$queryRaw<{ id: string }[]>`SELECT id FROM "SiteSetting" WHERE data::text LIKE ${like}`,
  ]);
  return [...new Set([...drafts.map((d) => `page "${d.title}"`), ...live.map((d) => `published page "${d.title}"`), ...(settings.length ? ["site settings"] : [])])];
}

async function refuseIfUsed(id: string, what: string) {
  const used = await contentUsage(id);
  return used.length ? `This ${what} is used by ${used.join(", ")}. Remove it there first.` : null;
}

async function uniqueSlug(model: "franchiseModel" | "menu" | "gallery" | "enquiryForm" | "state", slug: string, id: string | null) {
  if (!SLUG.test(slug)) return "Slug may only contain lowercase letters, numbers and single dashes.";
  const existing = await (db[model] as any).findUnique({ where: { slug }, select: { id: true } });
  return existing && existing.id !== id ? `The slug "${slug}" is already used.` : null;
}

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active — landing page" },
  { value: "ENQUIRY_ONLY", label: "Enquiries only" },
  { value: "COMING_SOON", label: "Coming soon" },
  { value: "UNAVAILABLE", label: "Unavailable (no enquiries)" },
  { value: "DRAFT", label: "Draft — hidden" },
];

export const RESOURCES: Record<string, Resource> = {
  states: {
    label: "States",
    singular: "state",
    description: "States visitors can choose, the page each one shows, contact overrides and cities.",
    columns: ["State", "URL", "Status", "Landing page", "Cities"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField("Used in the URL, e.g. kerala → /kerala"),
      { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
      { name: "landingPageId", label: "Landing page", type: "ref", ref: "page", help: "The page shown at this state's URL when the state is active" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
      { name: "phone", label: "Phone override", type: "text" },
      { name: "whatsapp", label: "WhatsApp override", type: "text" },
      { name: "email", label: "Email override", type: "text" },
      { name: "availabilityMessage", label: "Availability message", type: "textarea", help: "Shown on enquiry-only, coming-soon and unavailable state pages" },
      { name: "seoTitle", label: "SEO title", type: "text" },
      { name: "seoDescription", label: "SEO description", type: "textarea", max: 300 },
      { name: "cities", label: "Cities", type: "list", itemLabel: "name", max: 500, fields: [
        { name: "name", label: "City", type: "text", required: true },
        { name: "hidden", label: "Hide from suggestions", type: "boolean" },
      ] },
    ],
    async list() {
      const rows = await db.state.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { landingPage: { select: { title: true } }, _count: { select: { cities: true } } } });
      return rows.map((r) => ({ id: r.id, cells: [r.name, `/${r.slug}`, r.status.replace("_", " ").toLowerCase(), r.landingPage?.title ?? "—", String(r._count.cities)] }));
    },
    async load(id) {
      const r = await db.state.findUnique({ where: { id }, include: { cities: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] } } });
      if (!r) return null;
      return {
        ...r,
        landingPageId: r.landingPageId ?? "",
        phone: r.phone ?? "",
        whatsapp: r.whatsapp ?? "",
        email: r.email ?? "",
        availabilityMessage: r.availabilityMessage ?? "",
        seoTitle: r.seoTitle ?? "",
        seoDescription: r.seoDescription ?? "",
        cities: r.cities.map((c) => ({ name: c.name, hidden: !c.isActive })),
      };
    },
    async check(v, id) {
      const name = await db.state.findUnique({ where: { name: v.name }, select: { id: true } });
      if (name && name.id !== id) return `A state named "${v.name}" already exists.`;
      if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) return "Email override is not a valid email address.";
      return uniqueSlug("state", v.slug, id);
    },
    async save(tx, id, v) {
      const data = {
        name: v.name,
        slug: v.slug,
        status: v.status as StateStatus,
        sortOrder: v.sortOrder,
        landingPageId: v.landingPageId || null,
        phone: v.phone || null,
        whatsapp: v.whatsapp || null,
        email: v.email || null,
        availabilityMessage: v.availabilityMessage || null,
        seoTitle: v.seoTitle || null,
        seoDescription: v.seoDescription || null,
      };
      const row = id ? await tx.state.update({ where: { id }, data }) : await tx.state.create({ data });
      await tx.city.deleteMany({ where: { stateId: row.id } });
      const seen = new Set<string>();
      const cities = (v.cities as V[])
        .map((c, i) => ({ stateId: row.id, name: c.name, slug: slugify(c.name), isActive: !c.hidden, sortOrder: i }))
        .filter((c) => c.slug && !seen.has(c.slug) && seen.add(c.slug));
      if (cities.length) await tx.city.createMany({ data: cities });
      return row.id;
    },
    async remove(id) {
      // Enquiries keep their state name snapshot; the foreign key is nulled.
      await db.state.delete({ where: { id } });
      return null;
    },
  },

  testimonials: {
    label: "Testimonials",
    singular: "testimonial",
    description: "Franchise partner stories. Use tags (e.g. tamilnadu, north) to show different stories on different pages.",
    columns: ["Name", "Location", "Tag", "Published"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      { name: "location", label: "Location / role", type: "text" },
      { name: "quote", label: "Quote", type: "textarea", required: true, max: 1500 },
      { name: "rating", label: "Rating (1–5)", type: "number", min: 1, max: 5 },
      { name: "photoId", label: "Photo", type: "image" },
      { name: "tag", label: "Tag", type: "text" },
      { name: "isPublished", label: "Published", type: "boolean" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
    ],
    async list() {
      const rows = await db.testimonial.findMany({ orderBy: [{ tag: "asc" }, { sortOrder: "asc" }] });
      return rows.map((r) => ({ id: r.id, cells: [r.name, r.location ?? "—", r.tag ?? "—", yes(r.isPublished)] }));
    },
    async load(id) {
      const r = await db.testimonial.findUnique({ where: { id } });
      return r && { ...r, location: r.location ?? "", photoId: r.photoId ?? "", tag: r.tag ?? "" };
    },
    async save(tx, id, v) {
      const data = { name: v.name, location: v.location || null, quote: v.quote, rating: v.rating, photoId: v.photoId || null, tag: v.tag || null, isPublished: v.isPublished, sortOrder: v.sortOrder };
      return (id ? await tx.testimonial.update({ where: { id }, data }) : await tx.testimonial.create({ data })).id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "testimonial");
      if (used) return used;
      await db.testimonial.delete({ where: { id } });
      return null;
    },
  },

  faqs: {
    label: "FAQs",
    singular: "FAQ",
    description: "Questions and answers shown by FAQ sections.",
    columns: ["Question", "Tag", "Published"],
    fields: [
      { name: "question", label: "Question", type: "text", required: true },
      { name: "answer", label: "Answer", type: "richtext", required: true },
      { name: "tag", label: "Tag", type: "text" },
      { name: "isPublished", label: "Published", type: "boolean" },
      { name: "sortOrder", label: "Sort order", type: "number", min: 0 },
    ],
    async list() {
      const rows = await db.faq.findMany({ orderBy: { sortOrder: "asc" } });
      return rows.map((r) => ({ id: r.id, cells: [r.question, r.tag ?? "—", yes(r.isPublished)] }));
    },
    async load(id) {
      const r = await db.faq.findUnique({ where: { id } });
      return r && { ...r, tag: r.tag ?? "" };
    },
    async save(tx, id, v) {
      const data = { question: v.question, answer: v.answer, tag: v.tag || null, isPublished: v.isPublished, sortOrder: v.sortOrder };
      return (id ? await tx.faq.update({ where: { id }, data }) : await tx.faq.create({ data })).id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "FAQ");
      if (used) return used;
      await db.faq.delete({ where: { id } });
      return null;
    },
  },

  franchise: {
    label: "Franchise models",
    singular: "franchise model",
    description: "Investment figures, facts and cost breakdown. Pages reference a model, so one edit updates every page using it.",
    columns: ["Name", "Slug", "Total investment", "Royalty", "Published"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "totalInvestment", label: "Total investment", type: "text", required: true, help: "Display text, e.g. 3.75 Lakhs" },
      { name: "area", label: "Area", type: "text" },
      { name: "expansion", label: "Expansion", type: "text" },
      { name: "roi", label: "ROI", type: "text" },
      { name: "payback", label: "Pay back period", type: "text" },
      { name: "royalty", label: "Royalty", type: "text" },
      { name: "isPublished", label: "Published", type: "boolean" },
      { name: "breakdown", label: "Cost breakdown", type: "list", itemLabel: "label", fields: [
        { name: "label", label: "Label", type: "text", required: true },
        { name: "value", label: "Amount / value", type: "text" },
        { name: "note", label: "Note", type: "text" },
        { name: "icon", label: "Icon", type: "icon" },
      ] },
    ],
    async list() {
      const rows = await db.franchiseModel.findMany({ orderBy: { name: "asc" } });
      return rows.map((r) => ({ id: r.id, cells: [r.name, r.slug, r.totalInvestment, r.royalty ?? "—", yes(r.isPublished)] }));
    },
    async load(id) {
      const r = await db.franchiseModel.findUnique({ where: { id }, include: { breakdown: { orderBy: { sortOrder: "asc" } } } });
      if (!r) return null;
      const s = (x: string | null) => x ?? "";
      return { ...r, area: s(r.area), expansion: s(r.expansion), roi: s(r.roi), payback: s(r.payback), royalty: s(r.royalty), breakdown: r.breakdown.map((b) => ({ label: b.label, value: b.value, note: s(b.note), icon: s(b.icon) })) };
    },
    check: (v, id) => uniqueSlug("franchiseModel", v.slug, id),
    async save(tx, id, v) {
      const n = (x: string) => x || null;
      const data = { name: v.name, slug: v.slug, totalInvestment: v.totalInvestment, area: n(v.area), expansion: n(v.expansion), roi: n(v.roi), payback: n(v.payback), royalty: n(v.royalty), isPublished: v.isPublished };
      const row = id ? await tx.franchiseModel.update({ where: { id }, data }) : await tx.franchiseModel.create({ data });
      await tx.franchiseInvestmentItem.deleteMany({ where: { modelId: row.id } });
      await tx.franchiseInvestmentItem.createMany({ data: (v.breakdown as V[]).map((b, i) => ({ modelId: row.id, label: b.label, value: b.value, note: n(b.note), icon: n(b.icon), sortOrder: i })) });
      return row.id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "franchise model");
      if (used) return used;
      await db.franchiseModel.delete({ where: { id } });
      return null;
    },
  },

  menus: {
    label: "Menus",
    singular: "menu",
    description: "Menu categories, items and prices. Menu card sections can show a menu as accessible text.",
    columns: ["Name", "Slug", "Categories", "Items", "Published"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "description", label: "Description", type: "textarea" },
      { name: "isPublished", label: "Published", type: "boolean" },
      { name: "categories", label: "Categories", type: "list", itemLabel: "name", fields: [
        { name: "name", label: "Category", type: "text", required: true },
        { name: "items", label: "Items", type: "list", itemLabel: "name", max: 200, fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "price", label: "Price (₹)", type: "text", help: "Number, e.g. 35 or 35.50. Leave empty to hide." },
          { name: "description", label: "Description", type: "text" },
          { name: "hidden", label: "Hide (unavailable)", type: "boolean" },
        ] },
      ] },
    ],
    async list() {
      const rows = await db.menu.findMany({ orderBy: { name: "asc" }, include: { categories: { include: { _count: { select: { items: true } } } } } });
      return rows.map((r) => ({ id: r.id, cells: [r.name, r.slug, String(r.categories.length), String(r.categories.reduce((n, c) => n + c._count.items, 0)), yes(r.isPublished)] }));
    },
    async load(id) {
      const r = await db.menu.findUnique({ where: { id }, include: { categories: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } } } });
      if (!r) return null;
      return {
        name: r.name,
        slug: r.slug,
        description: r.description ?? "",
        isPublished: r.isPublished,
        categories: r.categories.map((c) => ({
          name: c.name,
          items: c.items.map((i) => ({ name: i.name, price: i.price?.toString() ?? "", description: i.description ?? "", hidden: !i.isAvailable })),
        })),
      };
    },
    async check(v, id) {
      for (const c of v.categories as V[]) for (const i of c.items as V[]) {
        if (i.price && !/^\d{1,7}(\.\d{1,2})?$/.test(i.price.trim())) return `Price for "${i.name}" must be a number like 35 or 35.50.`;
      }
      return uniqueSlug("menu", v.slug, id);
    },
    async save(tx, id, v) {
      const data = { name: v.name, slug: v.slug, description: v.description || null, isPublished: v.isPublished };
      const row = id ? await tx.menu.update({ where: { id }, data }) : await tx.menu.create({ data });
      await tx.menuCategory.deleteMany({ where: { menuId: row.id } });
      for (const [ci, c] of (v.categories as V[]).entries()) {
        await tx.menuCategory.create({
          data: {
            menuId: row.id,
            name: c.name,
            sortOrder: ci,
            items: { create: (c.items as V[]).map((i, ii) => ({ name: i.name, price: i.price ? i.price.trim() : null, description: i.description || null, isAvailable: !i.hidden, sortOrder: ii })) },
          },
        });
      }
      return row.id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "menu");
      if (used) return used;
      await db.menu.delete({ where: { id } });
      return null;
    },
  },

  galleries: {
    label: "Galleries",
    singular: "gallery",
    description: "Ordered sets of photos used by gallery sections.",
    columns: ["Name", "Slug", "Photos"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true },
      slugField(),
      { name: "items", label: "Photos", type: "list", itemLabel: "caption", max: 200, fields: [
        { name: "mediaId", label: "Image", type: "image", required: true },
        { name: "caption", label: "Caption", type: "text" },
      ] },
    ],
    async list() {
      const rows = await db.gallery.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { items: true } } } });
      return rows.map((r) => ({ id: r.id, cells: [r.name, r.slug, String(r._count.items)] }));
    },
    async load(id) {
      const r = await db.gallery.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
      return r && { name: r.name, slug: r.slug, items: r.items.map((i) => ({ mediaId: i.mediaId, caption: i.caption ?? "" })) };
    },
    check: (v, id) => uniqueSlug("gallery", v.slug, id),
    async save(tx, id, v) {
      const data = { name: v.name, slug: v.slug };
      const row = id ? await tx.gallery.update({ where: { id }, data }) : await tx.gallery.create({ data });
      await tx.galleryItem.deleteMany({ where: { galleryId: row.id } });
      await tx.galleryItem.createMany({ data: (v.items as V[]).map((i, n) => ({ galleryId: row.id, mediaId: i.mediaId, caption: i.caption || null, sortOrder: n })) });
      return row.id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "gallery");
      if (used) return used;
      await db.gallery.delete({ where: { id } });
      return null;
    },
  },

  forms: {
    label: "Enquiry forms",
    singular: "enquiry form",
    description: "Franchise enquiry forms: questions, choices, consent text and who gets notified.",
    columns: ["Name", "Slug", "Questions", "Notifies"],
    fields: [
      { name: "name", label: "Internal name", type: "text", required: true },
      slugField(),
      { name: "title", label: "Title shown on the form", type: "text", required: true },
      { name: "submitLabel", label: "Submit button label", type: "text", required: true },
      { name: "successMessage", label: "Success message", type: "textarea", required: true },
      { name: "showState", label: "Ask for state", type: "boolean" },
      { name: "showMessage", label: "Show message box", type: "boolean" },
      { name: "requireConsent", label: "Require consent checkbox", type: "boolean" },
      { name: "consentText", label: "Consent text", type: "textarea" },
      { name: "sendConfirmation", label: "Email a confirmation to the visitor", type: "boolean" },
      { name: "notifyEmails", label: "Notify these emails (comma separated)", type: "text" },
      { name: "fields", label: "Extra questions", type: "list", itemLabel: "label", max: 20, fields: QUESTION_FIELDS },
    ],
    async list() {
      const rows = await db.enquiryForm.findMany({ orderBy: { name: "asc" } });
      return rows.map((r) => ({ id: r.id, cells: [r.name, r.slug, String((r.fields as unknown[]).length), r.notifyEmails.join(", ") || "—"] }));
    },
    async load(id) {
      const r = await db.enquiryForm.findUnique({ where: { id } });
      return r && { ...r, consentText: r.consentText ?? "", notifyEmails: r.notifyEmails.join(", "), fields: r.fields as Values[] };
    },
    async check(v, id) {
      const q = questionsSchema.safeParse(v.fields);
      if (!q.success) return q.error.issues[0].message;
      const names = (v.fields as V[]).map((f) => f.name);
      if (new Set(names).size !== names.length) return "Each question needs a unique field key.";
      for (const f of v.fields as V[]) if (["radio", "select", "checkboxes"].includes(f.type) && !f.options.trim()) return `Question "${f.label}" needs choices.`;
      const emails = String(v.notifyEmails).split(",").map((e) => e.trim()).filter(Boolean);
      if (emails.some((e) => !/^\S+@\S+\.\S+$/.test(e))) return "One of the notification emails is not valid.";
      if (v.requireConsent && !v.consentText) return "Add consent text, or turn off 'Require consent checkbox'.";
      return uniqueSlug("enquiryForm", v.slug, id);
    },
    async save(tx, id, v) {
      const data = {
        name: v.name,
        slug: v.slug,
        title: v.title,
        submitLabel: v.submitLabel,
        successMessage: v.successMessage,
        showState: v.showState,
        showMessage: v.showMessage,
        requireConsent: v.requireConsent,
        consentText: v.consentText || null,
        sendConfirmation: v.sendConfirmation,
        notifyEmails: String(v.notifyEmails).split(",").map((e: string) => e.trim()).filter(Boolean),
        fields: v.fields as Prisma.InputJsonValue,
      };
      return (id ? await tx.enquiryForm.update({ where: { id }, data }) : await tx.enquiryForm.create({ data })).id;
    },
    async remove(id) {
      const used = await refuseIfUsed(id, "form");
      if (used) return used;
      await db.enquiryForm.delete({ where: { id } }); // enquiries keep their data; formId is nulled
      return null;
    },
  },

  navigation: {
    label: "Navigation",
    singular: "menu",
    description: "Header and footer links. Links starting with # only appear on pages that contain that section.",
    columns: ["Location", "Name", "Links"],
    fields: [
      { name: "key", label: "Location", type: "select", options: [
        { value: "header", label: "Header" },
        { value: "footer", label: "Footer" },
      ] },
      { name: "name", label: "Name", type: "text", required: true },
      { name: "items", label: "Links", type: "list", itemLabel: "label", max: 30, fields: [
        { name: "label", label: "Label", type: "text", required: true },
        { name: "href", label: "Link", type: "url", required: true },
        { name: "openInNewTab", label: "Open in new tab", type: "boolean" },
        { name: "hidden", label: "Hidden", type: "boolean" },
      ] },
    ],
    async list() {
      const rows = await db.navigationMenu.findMany({ orderBy: { key: "asc" }, include: { _count: { select: { items: true } } } });
      return rows.map((r) => ({ id: r.id, cells: [r.key, r.name, String(r._count.items)] }));
    },
    async load(id) {
      const r = await db.navigationMenu.findUnique({ where: { id }, include: { items: { orderBy: { sortOrder: "asc" } } } });
      return r && { key: r.key, name: r.name, items: r.items.map((i) => ({ label: i.label, href: i.href, openInNewTab: i.openInNewTab, hidden: !i.isVisible })) };
    },
    async check(v, id) {
      const other = await db.navigationMenu.findUnique({ where: { key: v.key }, select: { id: true } });
      return other && other.id !== id ? `There is already a ${v.key} menu.` : null;
    },
    async save(tx, id, v) {
      const data = { key: v.key, name: v.name };
      const row = id ? await tx.navigationMenu.update({ where: { id }, data }) : await tx.navigationMenu.create({ data });
      await tx.navigationItem.deleteMany({ where: { menuId: row.id } });
      await tx.navigationItem.createMany({ data: (v.items as V[]).map((i, n) => ({ menuId: row.id, label: i.label, href: i.href, openInNewTab: i.openInNewTab, isVisible: !i.hidden, sortOrder: n })) });
      return row.id;
    },
    async remove(id) {
      await db.navigationMenu.delete({ where: { id } });
      return null;
    },
  },

  redirects: {
    label: "Redirects",
    singular: "redirect",
    description: "Send old URLs (e.g. from the previous website) to their new pages. Changes apply within a minute.",
    columns: ["From", "To", "Type"],
    fields: [
      { name: "fromPath", label: "From path", type: "text", required: true, help: "e.g. /old-page" },
      { name: "toPath", label: "To", type: "url", required: true },
      { name: "permanent", label: "Permanent (308)", type: "boolean" },
    ],
    async list() {
      const rows = await db.redirect.findMany({ orderBy: { fromPath: "asc" } });
      return rows.map((r) => ({ id: r.id, cells: [r.fromPath, r.toPath, r.permanent ? "Permanent" : "Temporary"] }));
    },
    load: (id) => db.redirect.findUnique({ where: { id } }),
    async check(v, id) {
      v.fromPath = "/" + String(v.fromPath).trim().toLowerCase().replace(/^\/+|\/+$/g, "");
      if (!/^\/[a-z0-9\-/_.]+$/.test(v.fromPath)) return "From path must look like /old-page.";
      if (v.fromPath === v.toPath) return "A redirect cannot point to itself.";
      const other = await db.redirect.findUnique({ where: { fromPath: v.fromPath }, select: { id: true } });
      return other && other.id !== id ? `${v.fromPath} already redirects somewhere.` : null;
    },
    async save(tx, id, v) {
      const data = { fromPath: v.fromPath, toPath: v.toPath, permanent: v.permanent };
      return (id ? await tx.redirect.update({ where: { id }, data }) : await tx.redirect.create({ data })).id;
    },
    async remove(id) {
      await db.redirect.delete({ where: { id } });
      return null;
    },
  },
};
