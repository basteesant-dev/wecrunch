"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ActionForm";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUsage, sanitizeFolder } from "@/lib/media";
import { revalidateCms } from "@/lib/revalidate";
import { storage } from "@/lib/storage";

export async function updateMedia(id: string, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("media.manage");
  const alt = String(fd.get("alt") ?? "").trim().slice(0, 300);
  await db.mediaAsset.update({ where: { id }, data: { alt, folder: sanitizeFolder(String(fd.get("folder") ?? "")) } });
  await audit(user, "media.update", { entityType: "MediaAsset", entityId: id });
  revalidateCms();
  refresh();
  return { ok: true, message: "Saved." };
}

export async function deleteMedia(id: string): Promise<ActionResult> {
  const user = await requireUser("media.manage");
  const used = await mediaUsage(id);
  if (used.length) return { error: `This file is in use: ${used.join(", ")}. Remove it there first.` };
  const asset = await db.mediaAsset.delete({ where: { id } });
  await storage().remove(asset.key).catch((e) => console.error("Could not delete stored file", e));
  await audit(user, "media.delete", { entityType: "MediaAsset", entityId: id, summary: asset.filename });
  redirect("/admin/media");
}
