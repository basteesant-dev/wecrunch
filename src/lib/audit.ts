import { db } from "@/lib/db";
import { clientIp } from "@/lib/request";
import type { Prisma } from "@/generated/prisma/client";

type Actor = { id: string; email: string } | null;

export async function audit(
  actor: Actor,
  action: string,
  details: { entityType?: string; entityId?: string; summary?: string; meta?: Prisma.InputJsonValue } = {},
) {
  await db.auditLog.create({
    data: {
      userId: actor?.id,
      userEmail: actor?.email,
      action,
      entityType: details.entityType,
      entityId: details.entityId,
      summary: details.summary?.slice(0, 500),
      meta: details.meta,
      ip: await clientIp(),
    },
  });
}
