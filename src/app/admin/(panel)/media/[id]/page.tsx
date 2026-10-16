import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { Card, PageHeader, fmtDate, inputCls } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { mediaUsage } from "@/lib/media";
import { deleteMedia, updateMedia } from "../actions";

export default async function MediaDetail({ params }: PageProps<"/admin/media/[id]">) {
  await requireUser("media.manage");
  const { id } = await params;
  const m = await db.mediaAsset.findUnique({ where: { id }, include: { createdBy: { select: { name: true } } } });
  if (!m) notFound();
  const usage = await mediaUsage(id);
  return (
    <>
      <PageHeader title={m.filename} back={{ href: "/admin/media", label: "Media library" }} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          {m.kind === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.url} alt={m.alt} className="mx-auto max-h-[28rem] rounded" />
          ) : m.kind === "VIDEO" ? (
            <video src={m.url} controls preload="metadata" className="mx-auto max-h-[28rem] rounded" />
          ) : (
            <a href={m.url} target="_blank" rel="noopener" className="text-blue-700 hover:underline">
              Open PDF
            </a>
          )}
          <dl className="mt-4 grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
            <dt className="text-slate-500">URL</dt>
            <dd className="break-all font-mono text-xs">{m.url}</dd>
            <dt className="text-slate-500">Type</dt>
            <dd>{m.mimeType}</dd>
            <dt className="text-slate-500">Size</dt>
            <dd>{(m.size / 1024).toFixed(0)} KB</dd>
            {m.width && (
              <>
                <dt className="text-slate-500">Dimensions</dt>
                <dd>
                  {m.width} × {m.height}px
                </dd>
              </>
            )}
            <dt className="text-slate-500">Uploaded</dt>
            <dd>
              {fmtDate(m.createdAt)} by {m.createdBy?.name ?? "seed / system"}
            </dd>
          </dl>
        </Card>
        <div className="space-y-6">
          <Card title="Details">
            <ActionForm action={updateMedia.bind(null, m.id)} className="space-y-3 text-sm">
              <label className="block font-medium">
                Alt text
                <input name="alt" defaultValue={m.alt} className={`${inputCls} mt-1 block w-full`} />
                <span className="mt-1 block text-xs font-normal text-slate-500">Describe what the image shows. Leave empty only for purely decorative images.</span>
              </label>
              <label className="block font-medium">
                Folder
                <input name="folder" defaultValue={m.folder} className={`${inputCls} mt-1 block w-48`} />
              </label>
              <SubmitButton>Save</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Replace file">
            <p className="mb-3 text-sm text-slate-600">Every page using this {m.kind.toLowerCase()} will show the new file. It must be the same kind of file.</p>
            <MediaUploader mode="replace" assetId={m.id} />
          </Card>
          <Card title="Where it is used">
            {usage.length ? (
              <ul className="list-disc pl-5 text-sm">
                {usage.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Not used anywhere.</p>
            )}
            <ActionForm action={deleteMedia.bind(null, m.id)} className="mt-4">
              <SubmitButton variant="danger" confirm="Delete this file permanently?">
                Delete file
              </SubmitButton>
            </ActionForm>
          </Card>
        </div>
      </div>
    </>
  );
}
