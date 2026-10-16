"use client";

import { useRef, useState } from "react";

export type MediaLite = { id: string; url: string; alt: string; kind: string; filename: string; width?: number | null; height?: number | null };

function Thumb({ m }: { m: MediaLite }) {
  if (m.kind === "IMAGE") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={m.url} alt={m.alt} className="size-full object-cover" />;
  }
  return <span className="grid size-full place-items-center bg-slate-800 p-1 text-center text-xs text-white">{m.kind === "VIDEO" ? "▶ Video" : "PDF"}</span>;
}

export function MediaPicker({
  value,
  onChange,
  kind,
  initial,
  label,
}: {
  value: string;
  onChange: (id: string) => void;
  kind: "IMAGE" | "VIDEO";
  initial?: MediaLite;
  label: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<MediaLite | undefined>(initial);
  const [items, setItems] = useState<MediaLite[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load(query = q) {
    const res = await fetch(`/api/admin/media?kind=${kind}&q=${encodeURIComponent(query)}`);
    if (res.ok) setItems((await res.json()).items);
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError("");
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    fd.append("folder", "general");
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || "Upload failed");
    await load();
  }

  const current = selected && selected.id === value ? selected : undefined;

  return (
    <div className="flex items-center gap-3">
      <div className="size-20 shrink-0 overflow-hidden rounded border border-slate-300 bg-slate-100">
        {current ? <Thumb m={current} /> : value ? <span className="grid size-full place-items-center text-xs text-slate-500">Selected</span> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
          onClick={() => {
            dialog.current?.showModal();
            load();
          }}
        >
          {value ? "Change" : "Choose"} {kind === "IMAGE" ? "image" : "video"}
        </button>
        {value && (
          <button type="button" className="rounded px-3 py-1.5 text-sm text-red-700 hover:bg-red-50" onClick={() => onChange("")}>
            Remove
          </button>
        )}
        {current && <span className="w-full truncate text-xs text-slate-500">{current.filename}</span>}
      </div>

      <dialog ref={dialog} className="m-auto w-[min(56rem,95vw)] rounded-lg p-0 backdrop:bg-black/50" aria-label={`Choose ${label}`}>
        <div className="flex items-center gap-3 border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold">Media library</h2>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              load(e.target.value);
            }}
            placeholder="Search by name or alt text"
            className="ml-auto w-64 rounded border border-slate-300 px-3 py-1.5 text-sm"
            aria-label="Search media"
          />
          <label className="cursor-pointer rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
            {busy ? "Uploading…" : "Upload"}
            <input type="file" multiple accept={kind === "IMAGE" ? "image/*" : "video/mp4,video/webm"} className="sr-only" onChange={(e) => upload(e.target.files)} />
          </label>
          <button type="button" className="rounded px-2 py-1 text-xl leading-none hover:bg-slate-100" onClick={() => dialog.current?.close()} aria-label="Close">
            ×
          </button>
        </div>
        {error && <p className="px-4 pt-3 text-sm text-red-700" role="alert">{error}</p>}
        <ul className="grid max-h-[60vh] grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-5">
          {items.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className={`block w-full overflow-hidden rounded border-2 text-left ${m.id === value ? "border-blue-600" : "border-transparent hover:border-slate-400"}`}
                onClick={() => {
                  setSelected(m);
                  onChange(m.id);
                  dialog.current?.close();
                }}
              >
                <span className="block aspect-square">
                  <Thumb m={m} />
                </span>
                <span className="block truncate px-1 py-0.5 text-xs">{m.alt || m.filename}</span>
              </button>
            </li>
          ))}
          {!items.length && <li className="col-span-full py-10 text-center text-sm text-slate-500">No media yet. Upload a file to get started.</li>}
        </ul>
      </dialog>
    </div>
  );
}
