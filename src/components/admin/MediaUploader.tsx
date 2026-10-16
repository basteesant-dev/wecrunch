"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Upload new files (mode "create") or replace one asset's file (mode "replace").
export function MediaUploader({ mode = "create", assetId }: { mode?: "create" | "replace"; assetId?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setMessage(null);
    const res = await fetch(mode === "replace" ? `/api/admin/media/${assetId}` : "/api/admin/media", { method: mode === "replace" ? "PUT" : "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMessage({ ok: false, text: data.error || "Upload failed" });
    form.reset();
    setMessage({ ok: true, text: mode === "replace" ? "File replaced." : `Uploaded ${data.items.length} file(s).` });
    router.refresh();
  }

  const input = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3 text-sm">
      <label className="font-medium">
        {mode === "replace" ? "New file" : "Files"}
        <input
          type="file"
          name={mode === "replace" ? "file" : "files"}
          multiple={mode === "create"}
          required
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,application/pdf"
          className="mt-1 block"
        />
      </label>
      {mode === "create" && (
        <>
          <label className="font-medium">
            Folder
            <input name="folder" placeholder="general" className={`${input} mt-1 block w-36`} />
          </label>
          <label className="flex-1 font-medium">
            Alt text (describes the image for screen readers)
            <input name="alt" className={`${input} mt-1 block w-full`} />
          </label>
        </>
      )}
      <button type="submit" disabled={busy} className="min-h-9 rounded-md bg-slate-900 px-4 font-medium text-white disabled:opacity-50">
        {busy ? "Uploading…" : mode === "replace" ? "Replace file" : "Upload"}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className={`w-full ${message.ok ? "text-green-700" : "text-red-700"}`}>
          {message.text}
        </p>
      )}
      <p className="w-full text-xs text-slate-500">JPEG, PNG, WebP, AVIF, GIF up to 15 MB (stored as optimised WebP, max 2560px wide); MP4/WebM video; PDF. SVG is not accepted.</p>
    </form>
  );
}
