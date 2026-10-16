import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ title, description, actions, back }: { title: string; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {back && (
          <Link href={back.href} className="mb-1 inline-block text-sm text-slate-500 hover:text-slate-800">
            ← {back.label}
          </Link>
        )}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, title, className = "" }: { children: ReactNode; title?: string; className?: string }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>
      {title && <h2 className="mb-4 text-base font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

const BADGE: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  blue: "bg-blue-100 text-blue-800",
  slate: "bg-slate-100 text-slate-700",
};
export function Badge({ children, color = "slate" }: { children: ReactNode; color?: keyof typeof BADGE }) {
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${BADGE[color]}`}>{children}</span>;
}

export const btn = {
  primary: "inline-flex min-h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700",
  secondary: "inline-flex min-h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-800 hover:bg-slate-50",
};
export const inputCls = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
      {empty && <p className="p-8 text-center text-sm text-slate-500">{empty}</p>}
    </div>
  );
}

export function fmtDate(d: Date | string | null | undefined, withTime = true) {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}), timeZone: "Asia/Kolkata" }).format(new Date(d));
}

/** <input type="datetime-local"> value in IST for a Date. */
export function toLocalInput(d: Date | null | undefined) {
  if (!d) return "";
  const ist = new Date(d.getTime() + 330 * 60_000);
  return ist.toISOString().slice(0, 16);
}

/** Parses a datetime-local value entered in IST. */
export function fromLocalInput(v: string | null | undefined) {
  if (!v) return null;
  const d = new Date(`${v}:00+05:30`);
  return Number.isNaN(d.getTime()) ? null : d;
}
