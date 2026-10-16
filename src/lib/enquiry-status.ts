import type { EnquiryStatus } from "@/generated/prisma/enums";

export const ENQUIRY_STATUSES: EnquiryStatus[] = ["NEW", "CONTACTED", "QUALIFIED", "FOLLOW_UP", "CONVERTED", "CLOSED"];

export const STATUS_LABELS: Record<EnquiryStatus, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  FOLLOW_UP: "Follow-up",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};
