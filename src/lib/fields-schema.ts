import { z } from "zod";
import type { Field } from "@/lib/fields";
import { sanitizeRichText } from "@/lib/sanitize";

const ID = /^[a-z0-9]{0,40}$/i;
// Links may be relative, anchors, or http(s)/tel/mailto. No javascript:, data:, etc.
const SAFE_URL = /^(\/(?!\/)|#|https?:\/\/|tel:|mailto:)/i;

function fieldSchema(f: Field): z.ZodType {
  switch (f.type) {
    case "text":
    case "textarea": {
      const s = z.string().trim().max(f.max ?? (f.type === "text" ? 300 : 5000));
      return f.required ? s.min(1, `${f.label} is required`) : s.default("");
    }
    case "url": {
      const s = z
        .string()
        .trim()
        .max(1000)
        .refine((v) => v === "" || SAFE_URL.test(v), `${f.label} must start with /, #, https://, tel: or mailto:`);
      return f.required ? s.refine((v) => v !== "", `${f.label} is required`) : s.default("");
    }
    case "richtext": {
      const s = z.string().max(100_000).transform(sanitizeRichText);
      return f.required ? s.refine((v) => v !== "", `${f.label} is required`) : s.default("");
    }
    case "number": {
      let s = z.number();
      if (f.min !== undefined) s = s.min(f.min);
      if (f.max !== undefined) s = s.max(f.max);
      return f.required ? s : s.default(f.min ?? 0);
    }
    case "boolean":
      return z.boolean().default(false);
    case "select": {
      const values = f.options.map((o) => o.value) as [string, ...string[]];
      return z.enum(values).default(values[0]);
    }
    case "datetime":
      return z
        .string()
        .refine((v) => v === "" || !Number.isNaN(Date.parse(v)), `${f.label} must be a date`)
        .default("");
    case "icon":
      return z.string().max(60).default("");
    case "image":
    case "video":
    case "ref": {
      const id = z.string().regex(ID, `${f.label} is invalid`);
      if (f.type === "ref" && f.multiple) return z.array(id.min(1)).max(200).default([]);
      return f.required ? id.min(1, `${f.label} is required`) : id.default("");
    }
    case "list":
      return z.array(fieldsSchema(f.fields)).max(f.max ?? 100).default([]);
  }
}

export function fieldsSchema(fields: Field[]) {
  return z.object(Object.fromEntries(fields.map((f) => [f.name, fieldSchema(f)])));
}

export function formatZodError(error: z.ZodError) {
  return error.issues.map((i) => `${i.path.join(".") || "value"}: ${i.message}`).join("; ");
}
