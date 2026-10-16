"use server";

import type { ActionResult } from "@/components/admin/ActionForm";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldsSchema, formatZodError } from "@/lib/fields-schema";
import { revalidateCms } from "@/lib/revalidate";
import { ANALYTICS_ID, SETTINGS_FIELDS } from "@/lib/settings-fields";
import type { Prisma } from "@/generated/prisma/client";

export async function saveSettings(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("settings.manage");
  const parsed = fieldsSchema(SETTINGS_FIELDS).safeParse(JSON.parse(String(fd.get("values") ?? "{}")));
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const v = parsed.data as Record<string, unknown>;
  for (const k of ["gtmId", "gaId", "metaPixelId", "clarityId"]) {
    if (!ANALYTICS_ID.test(String(v[k] ?? ""))) return { error: `${k} may only contain letters, numbers and dashes.` };
  }
  const emails = String(v.notifyEmails ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (emails.some((e) => !/^\S+@\S+\.\S+$/.test(e))) return { error: "One of the sales team emails is not valid." };
  if (!/^\S+@\S+\.\S+$/.test(String(v.email))) return { error: "Contact email is not valid." };
  if (v.titleTemplate && !String(v.titleTemplate).includes("%s")) return { error: "The title template must contain %s." };
  await db.siteSetting.upsert({ where: { id: "site" }, update: { data: v as Prisma.InputJsonValue }, create: { id: "site", data: v as Prisma.InputJsonValue } });
  await audit(user, "settings.update", { entityType: "SiteSetting", entityId: "site" });
  revalidateCms();
  return { ok: true, message: "Settings saved and live." };
}
