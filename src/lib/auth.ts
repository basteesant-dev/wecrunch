import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { BRAND } from "@/brand";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { can, type Permission } from "@/lib/permissions";
import { clientIp, userAgent } from "@/lib/request";

const SESSION_HOURS = 12;

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: import("@/generated/prisma/enums").Role;
};

export async function createSession(userId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.session.create({
    data: { id: sha256(token), userId, expiresAt, ip: await clientIp(), userAgent: await userAgent() },
  });
  (await cookies()).set(BRAND.sessionCookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(BRAND.sessionCookie)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(BRAND.sessionCookie);
}

// Memoised per request.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection(); // session-bound: always rendered per request
  const token = (await cookies()).get(BRAND.sessionCookie)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { id: sha256(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, name: true, role: true, isActive: true } } },
  });
  if (!session || session.expiresAt < new Date() || !session.user.isActive) return null;
  const { isActive: _active, ...user } = session.user;
  return user;
});

// Every admin page and server action calls this; the layout check alone is not enough.
export async function requireUser(permission?: Permission): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (permission && !can(user.role, permission)) redirect(`/admin/dashboard?denied=${permission}`);
  return user;
}

// For route handlers: returns null instead of redirecting.
export async function userWith(permission: Permission) {
  const user = await getCurrentUser();
  return user && can(user.role, permission) ? user : null;
}
