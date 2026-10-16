"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav({ groups }: { groups: { title: string; items: { href: string; label: string }[] }[] }) {
  const path = usePathname();
  return (
    <nav aria-label="CMS" className="space-y-6">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="mb-1.5 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</p>
          <ul className="space-y-0.5">
            {g.items.map((i) => {
              const active = path === i.href || path.startsWith(i.href + "/");
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={active ? "page" : undefined}
                    className={`block rounded-md px-3 py-1.5 text-sm ${active ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/60 hover:text-white"}`}
                  >
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
