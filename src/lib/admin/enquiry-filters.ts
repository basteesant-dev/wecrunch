import type { Prisma } from "@/generated/prisma/client";
import { ENQUIRY_STATUSES } from "@/lib/enquiry-status";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export type EnquiryFilters = { q?: string; status?: string; state?: string; owner?: string; from?: string; to?: string; due?: string };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;

export function readFilters(sp: Record<string, string | string[] | undefined>): EnquiryFilters {
  return { q: one(sp.q), status: one(sp.status), state: one(sp.state), owner: one(sp.owner), from: one(sp.from), to: one(sp.to), due: one(sp.due) };
}

/** Dates are interpreted as India time (IST) calendar days. */
export function filterWhere(f: EnquiryFilters): Prisma.FranchiseEnquiryWhereInput {
  const where: Prisma.FranchiseEnquiryWhereInput = {};
  if (f.q) {
    const q = f.q.slice(0, 100);
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q.replace(/\s/g, "") } },
      { city: { contains: q, mode: "insensitive" } },
    ];
  }
  if (f.status && ENQUIRY_STATUSES.includes(f.status as EnquiryStatus)) where.status = f.status as EnquiryStatus;
  if (f.state) where.stateId = f.state === "none" ? null : f.state;
  if (f.owner) where.ownerId = f.owner === "none" ? null : f.owner;
  const from = f.from && /^\d{4}-\d{2}-\d{2}$/.test(f.from) ? new Date(`${f.from}T00:00:00+05:30`) : null;
  const to = f.to && /^\d{4}-\d{2}-\d{2}$/.test(f.to) ? new Date(`${f.to}T23:59:59.999+05:30`) : null;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };
  if (f.due) {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    where.followUpAt = { lte: end };
    where.status = { notIn: ["CONVERTED", "CLOSED"] };
  }
  return where;
}

export function filterQuery(f: EnquiryFilters, extra: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...f, ...extra })) if (v) params.set(k, v);
  return params.toString();
}

/** CSV cell: quoted, and neutralised against spreadsheet formula injection. */
export function csvCell(value: unknown) {
  let s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}
