import { db } from "@/lib/db";

// Fixed-window counter in PostgreSQL so limits hold across server instances.
// ponytail: one row per key per window; move to Redis if write volume ever matters.
export async function rateLimit(key: string, limit: number, windowSeconds: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number; windowStart: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "windowStart") VALUES (${key}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN 1 ELSE "RateLimit"."count" + 1 END,
      "windowStart" = CASE WHEN "RateLimit"."windowStart" < ${cutoff} THEN ${now} ELSE "RateLimit"."windowStart" END
    RETURNING "count", "windowStart"`;
  const { count, windowStart } = rows[0];
  const retryAfter = Math.max(1, Math.ceil((windowStart.getTime() + windowSeconds * 1000 - now.getTime()) / 1000));
  return { ok: count <= limit, remaining: Math.max(0, limit - count), retryAfter };
}

export async function clearRateLimit(key: string) {
  await db.rateLimit.deleteMany({ where: { key } });
}
