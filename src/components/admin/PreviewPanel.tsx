"use client";

import { useState } from "react";

const DEVICES = [
  { key: "mobile", label: "Mobile", width: 390 },
  { key: "tablet", label: "Tablet", width: 820 },
  { key: "desktop", label: "Desktop", width: 1280 },
] as const;

// Renders the DRAFT in an iframe at device widths, optionally as a given state.
export function PreviewPanel({ pageId, states }: { pageId: string; states: { slug: string; name: string }[] }) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]>(DEVICES[2]);
  const [state, setState] = useState("");
  const [nonce, setNonce] = useState(0);
  const src = `/admin/preview/${pageId}${state ? `?state=${state}` : ""}${state ? "&" : "?"}v=${nonce}`;
  const scale = Math.min(1, 760 / device.width);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Device" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
          {DEVICES.map((d) => (
            <button
              key={d.key}
              type="button"
              aria-pressed={device.key === d.key}
              onClick={() => setDevice(d)}
              className={`rounded px-3 py-1 text-sm ${device.key === d.key ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <label className="text-sm">
          <span className="sr-only">Preview as state</span>
          <select value={state} onChange={(e) => setState(e.target.value)} className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            <option value="">No state (brand-wide content)</option>
            {states.map((s) => (
              <option key={s.slug} value={s.slug}>
                As a visitor from {s.name}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setNonce(nonce + 1)} className="rounded-md border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-50">
          Reload
        </button>
        <a href={src} target="_blank" rel="noopener" className="text-sm text-blue-700 hover:underline">
          Open in new tab ↗
        </a>
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white" style={{ height: 640 }}>
        <iframe
          key={src + device.key}
          title="Draft preview"
          src={src}
          style={{ width: device.width, height: 640 / scale, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          className="border-0"
        />
      </div>
    </div>
  );
}
