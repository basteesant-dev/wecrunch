import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/content";
import { promoteScheduled } from "@/lib/pages";
import { revalidateCms } from "@/lib/revalidate";

// Run every 5 minutes (Vercel Cron, system cron, or any scheduler):
//   curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron
function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  return !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

async function run(request: Request) {
  await connection();
  if (!authorized(request)) return Response.json({ ok: false }, { status: 401 });
  const now = new Date();

  const published = await promoteScheduled(now);
  if (published) revalidateCms();

  // Data minimisation: anonymise closed enquiries after the configured retention period.
  const { retentionDays } = await getSettings();
  let anonymized = 0;
  if (retentionDays > 0) {
    const cutoff = new Date(now.getTime() - retentionDays * 86_400_000);
    ({ count: anonymized } = await db.franchiseEnquiry.updateMany({
      where: { status: "CLOSED", updatedAt: { lt: cutoff }, anonymizedAt: null },
      data: { fullName: "Anonymised", email: "", phone: "", city: null, message: null, answers: {}, ipHash: null, userAgent: null, referrer: null, anonymizedAt: now },
    }));
  }
  const { count: sessions } = await db.session.deleteMany({ where: { expiresAt: { lt: now } } });
  const { count: limits } = await db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now.getTime() - 86_400_000) } } });
  return Response.json({ ok: true, published, anonymized, sessions, limits });
}

export const GET = run;
export const POST = run;
