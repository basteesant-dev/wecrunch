import { connection } from "next/server";
import { db } from "@/lib/db";

// Liveness + database readiness for load balancers and uptime monitors.
export async function GET() {
  await connection();
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ ok: true, db: "up" }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, db: "down" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
