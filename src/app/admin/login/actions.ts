"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { createSession, destroySession, getCurrentUser } from "@/lib/auth";
import { hashIp, verifyPassword } from "@/lib/crypto";
import { db } from "@/lib/db";
import { clearRateLimit, rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";
import type { ActionResult } from "@/components/admin/ActionForm";

const LOCK_AFTER = 10;
const LOCK_MINUTES = 15;
const GENERIC = "Email or password is incorrect.";

export async function login(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };

  const key = `login:${hashIp(await clientIp()) ?? "unknown"}:${email}`;
  const limit = await rateLimit(key, 5, 15 * 60);
  if (!limit.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limit.retryAfter / 60)} minutes.` };

  const user = await db.adminUser.findUnique({ where: { email } });
  if (!user || !user.isActive) {
    await verifyPassword(password, "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA"); // keep timing similar
    await audit(null, "auth.login_failed", { summary: email });
    return { error: GENERIC };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { error: `This account is locked after repeated failed sign-ins. Try again after ${LOCK_MINUTES} minutes or ask a super admin.` };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const failed = user.failedLogins + 1;
    await db.adminUser.update({
      where: { id: user.id },
      data: { failedLogins: failed, lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    await audit(null, failed >= LOCK_AFTER ? "auth.locked" : "auth.login_failed", { summary: email, entityType: "AdminUser", entityId: user.id });
    return { error: GENERIC };
  }

  await db.adminUser.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  await clearRateLimit(key);
  await createSession(user.id);
  await audit(user, "auth.login", { entityType: "AdminUser", entityId: user.id });
  redirect("/admin/dashboard");
}

export async function logout() {
  const user = await getCurrentUser();
  await destroySession();
  if (user) await audit(user, "auth.logout", { entityType: "AdminUser", entityId: user.id });
  redirect("/admin/login");
}
