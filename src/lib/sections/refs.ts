import type { Field } from "@/lib/fields";
import type { SnapshotSection } from "@/lib/resolve";
import { SECTION_TYPES, isSectionType } from "@/lib/sections/registry";

export type RefRequest = {
  media: string[];
  forms: string[];
  menus: string[];
  galleries: string[];
  models: string[];
  testimonials: boolean;
  faqs: boolean;
};

function walk(fields: Field[], value: Record<string, unknown>, req: Record<string, Set<string>>) {
  for (const f of fields) {
    const v = value?.[f.name];
    if ((f.type === "image" || f.type === "video") && typeof v === "string" && v) req.media.add(v);
    if (f.type === "ref" && f.ref in REF_BUCKET) {
      const bucket = req[REF_BUCKET[f.ref as keyof typeof REF_BUCKET]];
      for (const id of Array.isArray(v) ? v : [v]) if (typeof id === "string" && id) bucket.add(id);
    }
    if (f.type === "list" && Array.isArray(v)) for (const item of v) walk(f.fields, item as Record<string, unknown>, req);
  }
}

const REF_BUCKET = { form: "forms", menu: "menus", gallery: "galleries", franchiseModel: "models" } as const;

/** Everything the given sections reference, so it can be loaded in one batch. */
export function collectRefs(sections: SnapshotSection[], extraFormIds: string[] = []): RefRequest {
  const req = { media: new Set<string>(), forms: new Set(extraFormIds.filter(Boolean)), menus: new Set<string>(), galleries: new Set<string>(), models: new Set<string>() };
  let testimonials = false;
  let faqs = false;
  for (const s of sections) {
    if (!isSectionType(s.type)) continue;
    walk(SECTION_TYPES[s.type].fields, s.content, req);
    if (s.type === "testimonials") testimonials = true;
    if (s.type === "faq") faqs = true;
  }
  const sorted = (s: Set<string>) => [...s].sort(); // stable cache keys
  return {
    media: sorted(req.media),
    forms: sorted(req.forms),
    menus: sorted(req.menus),
    galleries: sorted(req.galleries),
    models: sorted(req.models),
    testimonials,
    faqs,
  };
}
