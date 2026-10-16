import { z } from "zod";
import type { Field } from "@/lib/fields";

// Extra questions on an enquiry form (beyond name, email, mobile, state, city,
// message and consent, which are always stored in their own columns).
export const QUESTION_FIELDS: Field[] = [
  { name: "name", label: "Field key", type: "text", required: true, help: "Lowercase letters, numbers, underscores. Used in exports." },
  { name: "label", label: "Question", type: "text", required: true },
  { name: "type", label: "Answer type", type: "select", options: [
    { value: "radio", label: "Single choice (radio)" },
    { value: "select", label: "Single choice (dropdown)" },
    { value: "checkboxes", label: "Multiple choice" },
    { value: "text", label: "Short text" },
    { value: "textarea", label: "Long text" },
  ] },
  { name: "options", label: "Choices (one per line)", type: "textarea" },
  { name: "required", label: "Required", type: "boolean" },
];

export type Question = {
  name: string;
  label: string;
  type: "radio" | "select" | "checkboxes" | "text" | "textarea";
  options: string;
  required: boolean;
};

export const questionsSchema = z.array(
  z.object({
    name: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/, "Field key must be lowercase letters, numbers or underscores"),
    label: z.string().trim().min(1).max(300),
    type: z.enum(["radio", "select", "checkboxes", "text", "textarea"]),
    options: z.string().max(3000).default(""),
    required: z.boolean().default(false),
  }),
);

export function choices(q: Question) {
  return q.options.split("\n").map((o) => o.trim()).filter(Boolean);
}

/** Validates visitor answers against the form definition loaded from the database. */
export function validateAnswers(questions: Question[], raw: Record<string, unknown>) {
  const answers: Record<string, string | string[]> = {};
  const errors: Record<string, string> = {};
  for (const q of questions) {
    const value = raw[q.name];
    if (q.type === "checkboxes") {
      const list = (Array.isArray(value) ? value : value ? [value] : []).map(String);
      const allowed = choices(q);
      const picked = list.filter((v) => allowed.includes(v));
      if (picked.length !== list.length) errors[q.name] = "Invalid choice";
      else if (q.required && !picked.length) errors[q.name] = "Please choose at least one option";
      else if (picked.length) answers[q.name] = picked;
      continue;
    }
    const text = typeof value === "string" ? value.trim() : "";
    if (!text) {
      if (q.required) errors[q.name] = "This field is required";
      continue;
    }
    if ((q.type === "radio" || q.type === "select") && !choices(q).includes(text)) {
      errors[q.name] = "Invalid choice";
      continue;
    }
    answers[q.name] = text.slice(0, q.type === "textarea" ? 2000 : 300);
  }
  return { answers, errors };
}
