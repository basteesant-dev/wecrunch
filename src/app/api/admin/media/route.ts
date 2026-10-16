import type { NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { userWith } from "@/lib/auth";
import { db } from "@/lib/db";
import { MediaError, storeUpload } from "@/lib/media";
import { revalidateCms } from "@/lib/revalidate";
import { isSameOrigin } from "@/lib/request";
import type { MediaKind } from "@/generated/prisma/enums";

// Media library listing for the picker (CMS editors only).
export async function GET(request: NextRequest) {
  const user = (await userWith("media.manage")) ?? (await userWith("content.manage"));
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const kind = sp.get("kind");
  const q = sp.get("q")?.trim().slice(0, 100);
  const items = await db.mediaAsset.findMany({
    where: {
      ...(kind && ["IMAGE", "VIDEO", "DOCUMENT"].includes(kind) ? { kind: kind as MediaKind } : {}),
      ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { alt: { contains: q, mode: "insensitive" } }, { folder: { contains: q, mode: "insensitive" } }] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, url: true, alt: true, kind: true, filename: true, width: true, height: true, folder: true },
  });
  return Response.json({ items }, { headers: { "cache-control": "no-store" } });
}

// Multipart upload: files[], folder, alt.
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await userWith("media.manage");
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const fd = await request.formData().catch(() => null);
  if (!fd) return Response.json({ error: "Expected a multipart form upload" }, { status: 400 });
  const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return Response.json({ error: "Choose at least one file" }, { status: 400 });
  if (files.length > 20) return Response.json({ error: "Upload at most 20 files at a time" }, { status: 400 });
  const created = [];
  for (const file of files) {
    try {
      const asset = await storeUpload({
        buffer: Buffer.from(await file.arrayBuffer()),
        type: file.type,
        filename: file.name,
        folder: String(fd.get("folder") ?? ""),
        alt: String(fd.get("alt") ?? ""),
        userId: user.id,
      });
      created.push({ id: asset.id, url: asset.url, alt: asset.alt, kind: asset.kind, filename: asset.filename });
      await audit(user, "media.upload", { entityType: "MediaAsset", entityId: asset.id, summary: asset.filename });
    } catch (e) {
      const message = e instanceof MediaError ? `${file.name}: ${e.message}` : `${file.name}: upload failed`;
      if (!(e instanceof MediaError)) console.error(e);
      return Response.json({ error: message, created }, { status: 400 });
    }
  }
  revalidateCms();
  return Response.json({ items: created });
}
