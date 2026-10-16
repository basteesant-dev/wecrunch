"use server";

import { refresh } from "next/cache";
import type { ActionResult } from "@/components/admin/ActionForm";
import { fromLocalInput } from "@/components/admin/ui";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ENQUIRY_STATUSES } from "@/lib/enquiries";
import type { EnquiryStatus } from "@/generated/prisma/enums";

export async function updateEnquiry(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("enquiries.update");
  const status = String(fd.get("status") ?? "");
  if (!ENQUIRY_STATUSES.includes(status as EnquiryStatus)) return { error: "Choose a valid status." };
  const ownerId = String(fd.get("ownerId") ?? "") || null;
  if (ownerId && !(await db.adminUser.findFirst({ where: { id: ownerId, isActive: true } }))) return { error: "That owner is not an active user." };
  const followUpAt = fromLocalInput(String(fd.get("followUpAt") ?? ""));
  const before = await db.franchiseEnquiry.findUniqueOrThrow({ where: { id }, select: { status: true, ownerId: true, followUpAt: true } });
  await db.franchiseEnquiry.update({ where: { id }, data: { status: status as EnquiryStatus, ownerId, followUpAt } });
  const changes = [
    before.status !== status && `status ${before.status} → ${status}`,
    before.ownerId !== ownerId && "owner changed",
    before.followUpAt?.getTime() !== followUpAt?.getTime() && "follow-up date changed",
  ].filter(Boolean);
  if (changes.length) await audit(user, "enquiry.update", { entityType: "FranchiseEnquiry", entityId: id, summary: changes.join(", ") });
  refresh();
  return { ok: true, message: "Enquiry updated." };
}

export async function addNote(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("enquiries.update");
  const body = String(fd.get("body") ?? "").trim();
  if (!body) return { error: "Write a note first." };
  await db.enquiryNote.create({ data: { enquiryId: id, authorId: user.id, body: body.slice(0, 5000) } });
  await audit(user, "enquiry.note", { entityType: "FranchiseEnquiry", entityId: id });
  refresh();
  return { ok: true, message: "Note added." };
}
