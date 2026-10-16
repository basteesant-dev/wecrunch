// Declarative field descriptors. One description drives both the admin editor
// (rendered generically) and server-side validation (see fields-schema.ts).
// Plain data only: safe to pass from server to client components.

export type RefKind = "form" | "menu" | "gallery" | "franchiseModel" | "testimonial" | "faq" | "page" | "state";

type Base = { name: string; label: string; help?: string; required?: boolean };

export type Field =
  | (Base & { type: "text" | "textarea" | "url"; placeholder?: string; max?: number })
  | (Base & { type: "richtext" })
  | (Base & { type: "number"; min?: number; max?: number })
  | (Base & { type: "boolean" })
  | (Base & { type: "select"; options: { value: string; label: string }[] })
  | (Base & { type: "icon" })
  | (Base & { type: "image" | "video" })
  | (Base & { type: "datetime" })
  | (Base & { type: "ref"; ref: RefKind; multiple?: boolean })
  | (Base & { type: "list"; fields: Field[]; itemLabel?: string; max?: number });

export type Values = Record<string, unknown>;

export function emptyValues(fields: Field[]): Values {
  const out: Values = {};
  for (const f of fields) {
    switch (f.type) {
      case "boolean":
        out[f.name] = false;
        break;
      case "number":
        out[f.name] = f.min ?? 0;
        break;
      case "select":
        out[f.name] = f.options[0]?.value ?? "";
        break;
      case "list":
        out[f.name] = [];
        break;
      case "ref":
        out[f.name] = f.multiple ? [] : "";
        break;
      default:
        out[f.name] = "";
    }
  }
  return out;
}
