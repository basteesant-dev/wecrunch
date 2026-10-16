import type { Field } from "@/lib/fields";

export const PAGE_FIELDS: Field[] = [
  { name: "title", label: "Title", type: "text", required: true },
  { name: "slug", label: "Slug (URL)", type: "text", required: true, help: "Lowercase letters, numbers and dashes. The home page is always \"home\"." },
  { name: "seoTitle", label: "SEO title", type: "text", help: "Defaults to the title" },
  { name: "seoDescription", label: "SEO description", type: "textarea", max: 300 },
  { name: "ogImageId", label: "Social sharing image", type: "image" },
  { name: "canonicalUrl", label: "Canonical URL", type: "url", help: "Leave empty to use this page's own URL" },
  { name: "noIndex", label: "Hide from search engines (noindex)", type: "boolean" },
  { name: "phone", label: "Phone for this page", type: "text", help: "Overrides the site phone; states can override it again" },
  { name: "whatsapp", label: "WhatsApp for this page", type: "text" },
  { name: "email", label: "Email for this page", type: "text" },
];
