"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ActionForm";
import { RESOURCES } from "@/lib/admin/resources";
import { audit } from "@/lib/audit";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fieldsSchema, formatZodError } from "@/lib/fields-schema";
import { revalidateCms } from "@/lib/revalidate";

function friendly(e: unknown) {
  const code = (e as { code?: string })?.code;
  if (code === "P2002") return "Something with the same name, slug or path already exists.";
  if (code === "P2003") return "This item is still referenced by other content.";
  console.error(e);
  return "Could not save. Please try again.";
}

export async function saveResource(key: string, id: string | null, _: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const r = RESOURCES[key];
  if (!r) return { error: "Unknown content type." };
  let raw: unknown;
  try {
    raw = JSON.parse(String(fd.get("values") ?? "{}"));
  } catch {
    return { error: "The form data could not be read." };
  }
  const parsed = fieldsSchema(r.fields).safeParse(raw);
  if (!parsed.success) return { error: formatZodError(parsed.error) };
  const v = parsed.data as Record<string, unknown>;
  const problem = await r.check?.(v, id);
  if (problem) return { error: problem };
  let savedId: string;
  try {
    savedId = await db.$transaction((tx) => r.save(tx, id, v));
  } catch (e) {
    return { error: friendly(e) };
  }
  await audit(user, `${key}.${id ? "update" : "create"}`, {
    entityType: key,
    entityId: savedId,
    summary: String(v.name ?? v.question ?? v.fromPath ?? ""),
  });
  revalidateCms();
  if (!id) redirect(`/admin/${key}/${savedId}?created=1`);
  return { ok: true, message: "Saved. The change is live on the website." };
}

export async function deleteResource(key: string, id: string): Promise<ActionResult> {
  const user = await requireUser("content.manage");
  const r = RESOURCES[key];
  if (!r) return { error: "Unknown content type." };
  try {
    const refused = await r.remove(id);
    if (refused) return { error: refused };
  } catch (e) {
    return { error: friendly(e) };
  }
  await audit(user, `${key}.delete`, { entityType: key, entityId: id });
  revalidateCms();
  redirect(`/admin/${key}?deleted=1`);
}
