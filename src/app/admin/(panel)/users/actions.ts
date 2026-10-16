"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ActionForm";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { hashPassword, passwordProblems } from "@/lib/crypto";
import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";

const ROLES: Role[] = ["SUPER_ADMIN", "CONTENT_EDITOR", "ENQUIRY_MANAGER"];

export async function saveUser(id: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const actor = await requireUser("users.manage");
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const name = String(fd.get("name") ?? "").trim();
  const role = String(fd.get("role") ?? "") as Role;
  const isActive = fd.get("isActive") === "on";
  const password = String(fd.get("password") ?? "");
  if (!name) return { error: "Enter a name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if ((!id || password) && passwordProblems(password).length) return { error: `Password needs ${passwordProblems(password).join(", ")}.` };
  if (id === actor.id && (role !== "SUPER_ADMIN" || !isActive)) return { error: "You cannot remove your own super admin access." };
  const clash = await db.adminUser.findUnique({ where: { email }, select: { id: true } });
  if (clash && clash.id !== id) return { error: "Another user already has this email." };

  const data = { email, name, role, isActive, ...(password ? { passwordHash: await hashPassword(password), failedLogins: 0, lockedUntil: null } : {}) };
  const user = id ? await db.adminUser.update({ where: { id }, data }) : await db.adminUser.create({ data: { ...data, passwordHash: data.passwordHash! } });
  // Role, status or password changes sign the user out everywhere.
  if (id && (password || !isActive)) await db.session.deleteMany({ where: { userId: id } });
  await audit(actor, id ? "user.update" : "user.create", { entityType: "AdminUser", entityId: user.id, summary: `${email} (${role}${isActive ? "" : ", inactive"})` });
  if (!id) redirect(`/admin/users/${user.id}`);
  refresh();
  return { ok: true, message: password ? "Saved. The password was changed and existing sessions were signed out." : "Saved." };
}

export async function unlockUser(id: string): Promise<ActionResult> {
  const actor = await requireUser("users.manage");
  await db.adminUser.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  await audit(actor, "user.unlock", { entityType: "AdminUser", entityId: id });
  refresh();
  return { ok: true, message: "Unlocked." };
}
