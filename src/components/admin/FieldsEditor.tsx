"use client";

import { useId, useState } from "react";
import type { Field, Values } from "@/lib/fields";
import { emptyValues } from "@/lib/fields";
import { ICON_NAMES } from "@/lib/icons";
import { MediaPicker, type MediaLite } from "./MediaPicker";
import { RichTextEditor } from "./RichTextEditor";

export type RefOptions = Partial<Record<string, { value: string; label: string }[]>>;

const input = "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

type Ctx = { refs: RefOptions; media: Record<string, MediaLite>; uid: string };

function MultiRef({ options, value, onChange, id }: { options: { value: string; label: string }[]; value: string[]; onChange: (v: string[]) => void; id: string }) {
  const [q, setQ] = useState("");
  const shown = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="rounded-md border border-slate-300 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 p-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="flex-1 rounded border border-slate-200 px-2 py-1 text-sm" aria-label="Filter options" />
        <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => onChange(options.map((o) => o.value))}>
          All
        </button>
        <button type="button" className="text-xs text-blue-700 hover:underline" onClick={() => onChange([])}>
          None
        </button>
      </div>
      <ul id={id} className="max-h-48 overflow-y-auto p-2 text-sm">
        {shown.map((o) => (
          <li key={o.value}>
            <label className="flex items-center gap-2 py-0.5">
              <input
                type="checkbox"
                checked={value.includes(o.value)}
                onChange={(e) => onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          </li>
        ))}
        {!shown.length && <li className="text-slate-500">No options</li>}
      </ul>
      <p className="border-t border-slate-200 px-2 py-1 text-xs text-slate-500">{value.length} selected</p>
    </div>
  );
}

function FieldInput({ field, value, onChange, ctx, path }: { field: Field; value: unknown; onChange: (v: unknown) => void; ctx: Ctx; path: string }) {
  const id = `${ctx.uid}-${path}`;
  const str = typeof value === "string" ? value : "";
  switch (field.type) {
    case "text":
    case "url":
      return <input id={id} className={input} value={str} placeholder={field.type === "url" ? "/page, #section, https://…" : field.placeholder} onChange={(e) => onChange(e.target.value)} />;
    case "textarea":
      return <textarea id={id} className={input} rows={3} value={str} onChange={(e) => onChange(e.target.value)} />;
    case "richtext":
      return <RichTextEditor id={id} label={field.label} value={str} onChange={onChange} />;
    case "number":
      return (
        <input
          id={id}
          type="number"
          className={`${input} max-w-48`}
          value={typeof value === "number" ? value : ""}
          min={field.min}
          max={field.max}
          onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        />
      );
    case "boolean":
      return (
        <input id={id} type="checkbox" className="size-4" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      );
    case "select":
      return (
        <select id={id} className={input} value={str} onChange={(e) => onChange(e.target.value)}>
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    case "icon":
      return (
        <select id={id} className={input} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">No icon</option>
          {ICON_NAMES.map((n) => (
            <option key={n}>{n}</option>
          ))}
        </select>
      );
    case "datetime":
      return <input id={id} type="datetime-local" className={`${input} max-w-64`} value={str} onChange={(e) => onChange(e.target.value)} />;
    case "image":
    case "video":
      return <MediaPicker label={field.label} kind={field.type === "image" ? "IMAGE" : "VIDEO"} value={str} initial={ctx.media[str]} onChange={onChange} />;
    case "ref": {
      const options = ctx.refs[field.ref] ?? [];
      if (field.multiple) return <MultiRef id={id} options={options} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
      return (
        <select id={id} className={input} value={str} onChange={(e) => onChange(e.target.value)}>
          <option value="">— None —</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    case "list":
      return <ListInput field={field} value={Array.isArray(value) ? (value as Values[]) : []} onChange={onChange} ctx={ctx} path={path} />;
  }
}

function ListInput({ field, value, onChange, ctx, path }: { field: Extract<Field, { type: "list" }>; value: Values[]; onChange: (v: unknown) => void; ctx: Ctx; path: string }) {
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {value.map((item, i) => {
        const title = (field.itemLabel && String(item[field.itemLabel] ?? "")) || `Item ${i + 1}`;
        return (
          <details key={i} className="group rounded-md border border-slate-200 bg-slate-50" open={!String(item[field.itemLabel ?? ""] ?? "")}>
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1 truncate font-medium">{title}</span>
              <button type="button" className="rounded px-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-30" disabled={i === 0} onClick={(e) => (e.preventDefault(), move(i, -1))} aria-label={`Move ${title} up`}>
                ↑
              </button>
              <button type="button" className="rounded px-1.5 text-slate-600 hover:bg-slate-200 disabled:opacity-30" disabled={i === value.length - 1} onClick={(e) => (e.preventDefault(), move(i, 1))} aria-label={`Move ${title} down`}>
                ↓
              </button>
              <button type="button" className="rounded px-1.5 text-red-700 hover:bg-red-50" onClick={(e) => (e.preventDefault(), onChange(value.filter((_, n) => n !== i)))} aria-label={`Remove ${title}`}>
                ✕
              </button>
            </summary>
            <div className="border-t border-slate-200 bg-white p-3">
              <FieldList fields={field.fields} values={item} onChange={(v) => onChange(value.map((x, n) => (n === i ? v : x)))} ctx={ctx} path={`${path}-${i}`} />
            </div>
          </details>
        );
      })}
      {(field.max === undefined || value.length < field.max) && (
        <button type="button" className="rounded border border-dashed border-slate-400 px-3 py-1.5 text-sm hover:bg-slate-50" onClick={() => onChange([...value, emptyValues(field.fields)])}>
          + Add {field.label.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}

function FieldList({ fields, values, onChange, ctx, path }: { fields: Field[]; values: Values; onChange: (v: Values) => void; ctx: Ctx; path: string }) {
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const id = `${ctx.uid}-${path}-${f.name}`;
        const inline = f.type === "boolean";
        return (
          <div key={f.name} className={inline ? "flex items-center gap-2" : ""}>
            {inline && <FieldInput field={f} value={values[f.name]} onChange={(v) => onChange({ ...values, [f.name]: v })} ctx={ctx} path={`${path}-${f.name}`} />}
            <label htmlFor={id} className={`text-sm font-medium text-slate-800 ${inline ? "" : "mb-1 block"}`}>
              {f.label}
              {f.required && <span className="text-red-700"> *</span>}
            </label>
            {!inline && <FieldInput field={f} value={values[f.name]} onChange={(v) => onChange({ ...values, [f.name]: v })} ctx={ctx} path={`${path}-${f.name}`} />}
            {f.help && <p className="mt-1 text-xs text-slate-500">{f.help}</p>}
          </div>
        );
      })}
    </div>
  );
}

/** Generic form body for a list of field descriptors; submits JSON in a hidden input. */
export function FieldsEditor({
  fields,
  initial,
  name = "values",
  refs = {},
  media = {},
  groups,
}: {
  fields: Field[];
  initial: Values;
  name?: string;
  refs?: RefOptions;
  media?: Record<string, MediaLite>;
  groups?: { title: string; fields: Field[] }[];
}) {
  const [values, setValues] = useState<Values>(() => ({ ...emptyValues(fields), ...initial }));
  const ctx = { refs, media, uid: useId().replace(/:/g, "") };
  return (
    <>
      <input type="hidden" name={name} value={JSON.stringify(values)} />
      {groups ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <fieldset key={g.title} className="rounded-lg border border-slate-200 bg-white p-5">
              <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-slate-500">{g.title}</legend>
              <FieldList fields={g.fields} values={values} onChange={setValues} ctx={ctx} path={g.title.replace(/\W/g, "")} />
            </fieldset>
          ))}
        </div>
      ) : (
        <FieldList fields={fields} values={values} onChange={setValues} ctx={ctx} path="f" />
      )}
    </>
  );
}
