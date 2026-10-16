import { after } from "next/server";
import { getSettings } from "@/lib/content";
import { notifyEnquiry, submitEnquiry } from "@/lib/enquiries";
import { clientIp, isSameOrigin, userAgent } from "@/lib/request";

const MAX_BODY = 64 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY) return Response.json({ ok: false, error: "Too large" }, { status: 413 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ ok: false, error: "Invalid request" }, { status: 400 });

  const result = await submitEnquiry(body, { ip: await clientIp(), userAgent: await userAgent() });

  if (result.ok && result.enquiryId && !result.duplicate) {
    const settings = await getSettings();
    const id = result.enquiryId;
    after(() => notifyEnquiry(id, settings.siteName, settings.notifyEmails).catch((e) => console.error("Enquiry notification failed", e)));
  }
  const { ok } = result;
  return Response.json(
    ok ? { ok, message: result.message } : { ok, error: result.error, fieldErrors: result.fieldErrors },
    { status: ok ? 200 : result.status },
  );
}
