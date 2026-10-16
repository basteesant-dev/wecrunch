import Link from "next/link";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { Badge, Card, PageHeader, btn, inputCls } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { MediaKind } from "@/generated/prisma/enums";

export default async function MediaLibrary({ searchParams }: PageProps<"/admin/media">) {
  await requireUser("media.manage");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const folder = typeof sp.folder === "string" ? sp.folder : "";
  const kind = typeof sp.kind === "string" && ["IMAGE", "VIDEO", "DOCUMENT"].includes(sp.kind) ? (sp.kind as MediaKind) : undefined;
  const [items, folders] = await Promise.all([
    db.mediaAsset.findMany({
      where: {
        ...(kind ? { kind } : {}),
        ...(folder ? { folder } : {}),
        ...(q ? { OR: [{ filename: { contains: q, mode: "insensitive" } }, { alt: { contains: q, mode: "insensitive" } }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    db.mediaAsset.findMany({ distinct: ["folder"], select: { folder: true }, orderBy: { folder: "asc" } }),
  ]);
  const missingAlt = items.filter((i) => i.kind === "IMAGE" && !i.alt).length;

  return (
    <>
      <PageHeader title="Media library" description="Images, videos and documents used across the website." />
      <Card title="Upload" className="mb-6">
        <MediaUploader />
      </Card>
      <form method="get" className="mb-4 flex flex-wrap items-end gap-3 text-sm">
        <input name="q" defaultValue={q} placeholder="Search name or alt text" aria-label="Search" className={inputCls} />
        <select name="folder" defaultValue={folder} aria-label="Folder" className={inputCls}>
          <option value="">All folders</option>
          {folders.map((f) => (
            <option key={f.folder}>{f.folder}</option>
          ))}
        </select>
        <select name="kind" defaultValue={kind ?? ""} aria-label="Type" className={inputCls}>
          <option value="">All types</option>
          <option value="IMAGE">Images</option>
          <option value="VIDEO">Videos</option>
          <option value="DOCUMENT">Documents</option>
        </select>
        <button type="submit" className={btn.secondary}>
          Filter
        </button>
        {missingAlt > 0 && <Badge color="amber">{missingAlt} image(s) missing alt text</Badge>}
      </form>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
        {items.map((m) => (
          <li key={m.id}>
            <Link href={`/admin/media/${m.id}`} className="block overflow-hidden rounded-lg border border-slate-200 bg-white hover:border-slate-400">
              <span className="block aspect-square bg-slate-100">
                {m.kind === "IMAGE" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.alt} loading="lazy" className="size-full object-cover" />
                ) : (
                  <span className="grid size-full place-items-center text-sm text-slate-500">{m.kind === "VIDEO" ? "▶ Video" : "PDF"}</span>
                )}
              </span>
              <span className="block truncate px-2 pt-1.5 text-xs font-medium">{m.filename}</span>
              <span className="block truncate px-2 pb-1.5 text-xs text-slate-500">{m.alt || <em className="text-amber-700">No alt text</em>}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!items.length && <p className="py-10 text-center text-sm text-slate-500">No media found.</p>}
    </>
  );
}
