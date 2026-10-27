import type { Role } from "@/generated/prisma/enums";

// Modules a user can be granted, one checkbox each on the user's page.
export const PERMISSIONS = {
  "content.manage": "Content — pages, sections, states, menus, galleries, testimonials, FAQs, franchise, forms, navigation, SEO",
  "media.manage": "Media library",
  "enquiries.read": "Enquiries — view",
  "enquiries.update": "Enquiries — change status, owner, follow-up, notes",
  "enquiries.export": "Enquiries — export CSV",
  "settings.manage": "Site settings, analytics & GTM",
  "users.manage": "Users & permissions",
  "audit.read": "Audit log",
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_KEYS = Object.keys(PERMISSIONS) as Permission[];

// What each role starts with; the boxes can then be changed per user.
export const ROLE_PRESETS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: PERMISSION_KEYS,
  CONTENT_EDITOR: ["content.manage", "media.manage"],
  ENQUIRY_MANAGER: ["enquiries.read", "enquiries.update", "enquiries.export"],
};

export function can(user: { role: Role; permissions: readonly string[] }, permission: Permission) {
  return user.role === "SUPER_ADMIN" || user.permissions.includes(permission);
}

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  CONTENT_EDITOR: "Content Editor",
  ENQUIRY_MANAGER: "Enquiry Manager",
};
