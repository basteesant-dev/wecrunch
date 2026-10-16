import { z } from "zod";
import { fieldsSchema, formatZodError } from "@/lib/fields-schema";
import { SECTION_SETTINGS_FIELDS, SECTION_TYPES, isSectionType } from "@/lib/sections/registry";

const anchor = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]*$/i, "Anchor ID may only contain letters, numbers and dashes")
  .max(60);

export function validateSection(type: string, content: unknown, settings: unknown) {
  if (!isSectionType(type)) return { ok: false as const, error: `Unknown section type "${type}"` };
  const c = fieldsSchema(SECTION_TYPES[type].fields).safeParse(content ?? {});
  if (!c.success) return { ok: false as const, error: formatZodError(c.error) };
  const s = fieldsSchema(SECTION_SETTINGS_FIELDS(type)).extend({ anchorId: anchor.default("") }).safeParse(settings ?? {});
  if (!s.success) return { ok: false as const, error: formatZodError(s.error) };
  return { ok: true as const, content: c.data, settings: s.data };
}

export const sectionKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]*$/i, "Override key may only contain letters, numbers and dashes")
  .max(60);
