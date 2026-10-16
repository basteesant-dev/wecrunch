import type { Role } from "@/generated/prisma/enums";

export type Permission =
  | "content.manage" // pages, sections, states, menus, galleries, testimonials, FAQs, franchise, forms, navigation, SEO
  | "media.manage"
  | "enquiries.read"
  | "enquiries.update"
  | "enquiries.export"
  | "settings.manage"
  | "users.manage"
  | "audit.read";

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: [
    "content.manage",
    "media.manage",
    "enquiries.read",
    "enquiries.update",
    "enquiries.export",
    "settings.manage",
    "users.manage",
    "audit.read",
  ],
  CONTENT_EDITOR: ["content.manage", "media.manage"],
  ENQUIRY_MANAGER: ["enquiries.read", "enquiries.update", "enquiries.export"],
};

export function can(role: Role, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CONTENT_EDITOR: "Content Editor",
  ENQUIRY_MANAGER: "Enquiry Manager",
};
