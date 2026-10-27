import { z } from "zod";
import { detectAiAgent, trafficLabel } from "@/lib/attribution";
import { db } from "@/lib/db";
import { hashIp } from "@/lib/crypto";
import { sendMail } from "@/lib/email";
import { validateAnswers, type Question } from "@/lib/forms";
import { normalizeEmail, normalizePhone } from "@/lib/phone";
import { rateLimit } from "@/lib/ratelimit";

const ID = /^[a-z0-9]{1,40}$/i;
const short = (max: number) => z.string().trim().max(max).optional().default("");

export const enquiryInputSchema = z.object({
  formId: z.string().regex(ID, "Invalid form"),
  fullName: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().max(200).pipe(z.email("Please enter a valid email")),
  phone: z.string().trim().min(6, "Please enter your mobile number").max(30),
  stateSlug: short(80),
  city: short(120),
  message: short(2000),
  answers: z.record(z.string(), z.union([z.string().max(2000), z.array(z.string().max(300)).max(20)])).default({}),
  consent: z.boolean().default(false),
  website: z.string().max(500).optional(), // honeypot: real visitors never fill this
  turnstileToken: z.string().max(4000).optional(),
  sourcePath: short(300),
  utm_source: short(200),
  utm_medium: short(200),
  utm_campaign: short(200),
  utm_term: short(200),
  utm_content: short(200),
  utm_adgroupname: short(200),
  landing_page: short(2000),
  utmSource: short(200),
  utmMedium: short(200),
  utmCampaign: short(200),
  utmTerm: short(200),
  utmContent: short(200),
  utmAdgroupName: short(200),
  landingPage: short(2000),
  attribution: z
    .object({
      utmSource: short(200),
      utmMedium: short(200),
      utmCampaign: short(200),
      utmTerm: short(200),
      utmContent: short(200),
      utmAdgroupName: short(200),
      landingPage: short(2000),
      referrer: short(500),
      trafficSource: short(60),
    })
    .partial()
    .default({}),
});

export type EnquiryInput = z.input<typeof enquiryInputSchema>;

export type SubmitResult =
  | { ok: true; message: string; enquiryId: string | null; duplicate: boolean }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

const DUPLICATE_WINDOW_MS = 10 * 60_000;
const RATE_LIMIT = { count: 5, windowSeconds: 600 };

async function verifyTurnstile(token: string | undefined, ip: string | null) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) });
  const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  return ((await res.json()) as { success?: boolean }).success === true;
}

export async function submitEnquiry(
  raw: unknown,
  ctx: { ip: string | null; userAgent: string | null; signatureAgent?: string | null },
): Promise<SubmitResult> {
  const parsed = enquiryInputSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, status: 400, error: "Please check the highlighted fields.", fieldErrors };
  }
  const input = parsed.data;

  // Bots that fill the hidden field get a normal-looking success and nothing is stored.
  if (input.website) return { ok: true, message: "Thank you!", enquiryId: null, duplicate: false };

  const ipHash = hashIp(ctx.ip);
  const limit = await rateLimit(`enquiry:${ipHash ?? "unknown"}`, RATE_LIMIT.count, RATE_LIMIT.windowSeconds);
  if (!limit.ok) return { ok: false, status: 429, error: `Too many submissions. Please try again in ${Math.ceil(limit.retryAfter / 60)} minute(s).` };

  if (!(await verifyTurnstile(input.turnstileToken, ctx.ip))) return { ok: false, status: 400, error: "Spam check failed. Please try again." };

  const form = await db.enquiryForm.findUnique({ where: { id: input.formId } });
  if (!form) return { ok: false, status: 400, error: "This form is no longer available." };

  const fieldErrors: Record<string, string> = {};
  const { answers, errors } = validateAnswers(form.fields as Question[], input.answers);
  Object.assign(fieldErrors, errors);

  const phone = normalizePhone(input.phone);
  if (!phone) fieldErrors.phone = "Please enter a valid mobile number";

  let state: { id: string; name: string } | null = null;
  if (input.stateSlug) {
    const found = await db.state.findUnique({ where: { slug: input.stateSlug }, select: { id: true, name: true, status: true } });
    if (!found || found.status === "DRAFT") fieldErrors.stateSlug = "Please choose a valid state";
    else if (found.status === "UNAVAILABLE") fieldErrors.stateSlug = `We are not accepting franchise enquiries for ${found.name} yet`;
    else state = { id: found.id, name: found.name };
  } else if (form.showState) {
    fieldErrors.stateSlug = "Please choose your state";
  }

  if (form.requireConsent && !input.consent) fieldErrors.consent = "Please accept to continue";

  if (Object.keys(fieldErrors).length) return { ok: false, status: 400, error: "Please check the highlighted fields.", fieldErrors };

  // Double clicks / resubmits within 10 minutes are acknowledged but not stored twice.
  const recent = await db.franchiseEnquiry.findFirst({
    where: { phone: phone!, formId: form.id, createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) } },
    select: { id: true },
  });
  if (recent) return { ok: true, message: form.successMessage, enquiryId: recent.id, duplicate: true };

  const a = input.attribution ?? {};
  const utmSource = input.utmSource || input.utm_source || a.utmSource || null;
  const utmMedium = input.utmMedium || input.utm_medium || a.utmMedium || null;
  const utmCampaign = input.utmCampaign || input.utm_campaign || a.utmCampaign || null;
  const utmTerm = input.utmTerm || input.utm_term || a.utmTerm || null;
  const utmContent = input.utmContent || input.utm_content || a.utmContent || null;
  const utmAdgroupName = input.utmAdgroupName || input.utm_adgroupname || a.utmAdgroupName || null;
  const landingPage = input.landingPage || input.landing_page || a.landingPage || null;
  // An AI agent filling the form for someone outranks how the page was first reached.
  const aiAgent = detectAiAgent(ctx.userAgent, ctx.signatureAgent);
  const trafficSource = aiAgent ? `ai_agent:${aiAgent}` : a.trafficSource || utmSource || null;

  const enquiry = await db.franchiseEnquiry.create({
    data: {
      formId: form.id,
      fullName: input.fullName,
      email: normalizeEmail(input.email),
      phone: phone!,
      stateId: state?.id,
      stateName: state?.name,
      city: input.city || null,
      message: form.showMessage ? input.message || null : null,
      answers,
      consent: input.consent,
      consentText: input.consent ? form.consentText : null,
      sourcePath: input.sourcePath || null,
      landingPage,
      utmSource,
      utmMedium,
      utmCampaign,
      utmTerm,
      utmContent,
      utmAdgroupName,
      trafficSource,
      referrer: a.referrer || null,
      ipHash,
      userAgent: ctx.userAgent,
    },
  });
  return { ok: true, message: form.successMessage, enquiryId: enquiry.id, duplicate: false };
}

/** Sales notification + optional visitor confirmation. Runs after the response is sent. */
export async function notifyEnquiry(enquiryId: string, siteName: string, extraRecipients: string) {
  const e = await db.franchiseEnquiry.findUnique({ where: { id: enquiryId }, include: { form: true } });
  if (!e) return;
  const recipients = [...(e.form?.notifyEmails ?? []), ...extraRecipients.split(",")].map((s) => s.trim()).filter(Boolean);
  const answers = Object.entries(e.answers as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
    .join("\n");
  await sendMail(
    [...new Set(recipients)],
    `New ${siteName} franchise enquiry — ${e.fullName}${e.stateName ? ` (${e.stateName})` : ""}`,
    [
      `Name: ${e.fullName}`,
      `Mobile: ${e.phone}`,
      `Email: ${e.email}`,
      `State: ${e.stateName ?? "-"}`,
      `City: ${e.city ?? "-"}`,
      answers,
      `Message: ${e.message ?? "-"}`,
      `Source: ${e.sourcePath ?? "-"} (${trafficLabel(e.trafficSource) || "unknown"})`,
      `UTM Source: ${e.utmSource ?? "-"}`,
      `UTM Medium: ${e.utmMedium ?? "-"}`,
      `UTM Campaign: ${e.utmCampaign ?? "-"}`,
      `UTM Ad group: ${e.utmAdgroupName ?? "-"}`,
      `UTM Content: ${e.utmContent ?? "-"}`,
      `UTM Term: ${e.utmTerm ?? "-"}`,
      `Landing Page: ${e.landingPage ?? "-"}`,
    ].join("\n"),
  );
  if (e.form?.sendConfirmation) {
    await sendMail(e.email, `Thank you for your interest in ${siteName}`, `Hi ${e.fullName},\n\n${e.form.successMessage}\n\n— ${siteName}`);
  }
}

export { ENQUIRY_STATUSES, STATUS_LABELS } from "@/lib/enquiry-status";
