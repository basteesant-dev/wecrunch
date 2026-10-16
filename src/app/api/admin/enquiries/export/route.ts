import type { NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { userWith } from "@/lib/auth";
import { db } from "@/lib/db";
import { csvCell, filterWhere, readFilters } from "@/lib/admin/enquiry-filters";
import { STATUS_LABELS } from "@/lib/enquiries";
import { BRAND } from "@/brand";

const MAX_ROWS = 50_000;

export async function GET(request: NextRequest) {
  const user = await userWith("enquiries.export");
  if (!user) return new Response("Forbidden", { status: 403 });
  const f = readFilters(Object.fromEntries(request.nextUrl.searchParams));
  const rows = await db.franchiseEnquiry.findMany({
    where: filterWhere(f),
    orderBy: { createdAt: "desc" },
    take: MAX_ROWS,
    include: { owner: { select: { name: true } }, form: { select: { name: true } } },
  });

  const answerKeys = [...new Set(rows.flatMap((r) => Object.keys(r.answers as object)))];
  const ist = new Intl.DateTimeFormat("en-IN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Kolkata" });
  const header = [
    "Received (IST)", "Name", "Email", "Mobile", "State", "City", "Status", "Owner", "Follow up (IST)", "Message",
    ...answerKeys, "Consent", "Form", "Traffic source", "UTM source", "UTM medium", "UTM campaign", "UTM term", "UTM content",
    "Landing page", "Submitted on", "Referrer", "ID",
  ];
  const lines = rows.map((r) => {
    const a = r.answers as Record<string, unknown>;
    return [
      ist.format(r.createdAt), r.fullName, r.email, r.phone, r.stateName, r.city, STATUS_LABELS[r.status], r.owner?.name,
      r.followUpAt ? ist.format(r.followUpAt) : "", r.message, ...answerKeys.map((k) => a[k]), r.consent ? "Yes" : "No", r.form?.name,
      r.trafficSource, r.utmSource, r.utmMedium, r.utmCampaign, r.utmTerm, r.utmContent, r.landingPage, r.sourcePath, r.referrer, r.id,
    ].map(csvCell).join(",");
  });

  await audit(user, "enquiry.export", { summary: `${rows.length} rows`, meta: { filters: f } });
  const stamp = new Date().toISOString().slice(0, 10);
  // BOM so Excel opens UTF-8 (₹, names) correctly.
  return new Response("﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${BRAND.key}-enquiries-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
}
