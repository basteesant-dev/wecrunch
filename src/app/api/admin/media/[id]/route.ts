import { audit } from "@/lib/audit";
import { userWith } from "@/lib/auth";
import { MediaError, replaceUpload } from "@/lib/media";
import { revalidateCms } from "@/lib/revalidate";
import { isSameOrigin } from "@/lib/request";

// Replace the file behind an asset; every page using it shows the new file.
export async function PUT(request: Request, { params }: RouteContext<"/api/admin/media/[id]">) {
  if (!isSameOrigin(request)) return Response.json({ error: "Forbidden" }, { status: 403 });
  const user = await userWith("media.manage");
  if (!user) return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const file = (await request.formData().catch(() => null))?.get("file");
  if (!(file instanceof File) || !file.size) return Response.json({ error: "Choose a file" }, { status: 400 });
  try {
    const asset = await replaceUpload(id, { buffer: Buffer.from(await file.arrayBuffer()), type: file.type, filename: file.name });
    await audit(user, "media.replace", { entityType: "MediaAsset", entityId: id, summary: file.name });
    revalidateCms();
    return Response.json({ id: asset.id, url: asset.url });
  } catch (e) {
    if (e instanceof MediaError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
