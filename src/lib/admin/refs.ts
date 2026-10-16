import { db } from "@/lib/db";
import type { Field, RefKind, Values } from "@/lib/fields";
import type { MediaLite } from "@/components/admin/MediaPicker";

function refKinds(fields: Field[], out = new Set<RefKind>()) {
  for (const f of fields) {
    if (f.type === "ref") out.add(f.ref);
    if (f.type === "list") refKinds(f.fields, out);
  }
  return out;
}

/** Options for every ref field in `fields`, for the admin editor. */
export async function loadRefOptions(fields: Field[]) {
  const kinds = refKinds(fields);
  const out: Record<string, { value: string; label: string }[]> = {};
  const load: Record<RefKind, () => Promise<{ value: string; label: string }[]>> = {
    form: async () => (await db.enquiryForm.findMany({ orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name })),
    menu: async () => (await db.menu.findMany({ orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name })),
    gallery: async () => (await db.gallery.findMany({ orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name })),
    franchiseModel: async () => (await db.franchiseModel.findMany({ orderBy: { name: "asc" } })).map((r) => ({ value: r.id, label: r.name })),
    testimonial: async () =>
      (await db.testimonial.findMany({ orderBy: [{ tag: "asc" }, { sortOrder: "asc" }] })).map((r) => ({ value: r.id, label: `${r.name}${r.tag ? ` (${r.tag})` : ""}` })),
    faq: async () => (await db.faq.findMany({ orderBy: { sortOrder: "asc" } })).map((r) => ({ value: r.id, label: r.question })),
    page: async () => (await db.page.findMany({ orderBy: { title: "asc" } })).map((r) => ({ value: r.id, label: `${r.title} (/${r.slug === "home" ? "" : r.slug})` })),
    state: async () => (await db.state.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] })).map((r) => ({ value: r.id, label: r.name })),
  };
  await Promise.all([...kinds].map(async (k) => (out[k] = await load[k]())));
  return out;
}

function mediaIds(fields: Field[], values: Values, out: Set<string>) {
  for (const f of fields) {
    const v = values?.[f.name];
    if ((f.type === "image" || f.type === "video") && typeof v === "string" && v) out.add(v);
    if (f.type === "list" && Array.isArray(v)) for (const item of v) mediaIds(f.fields, item as Values, out);
  }
  return out;
}

/** Thumbnails for media already referenced by `values`. */
export async function loadMediaPreviews(fields: Field[], values: Values): Promise<Record<string, MediaLite>> {
  const ids = [...mediaIds(fields, values, new Set())];
  if (!ids.length) return {};
  const rows = await db.mediaAsset.findMany({ where: { id: { in: ids } }, select: { id: true, url: true, alt: true, kind: true, filename: true } });
  return Object.fromEntries(rows.map((r) => [r.id, r]));
}
