import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireUser } from "@/lib/auth";
import { can, ROLE_LABELS, type Permission } from "@/lib/permissions";
import { BRAND } from "@/brand";
import { logout } from "../login/actions";

const GROUPS: { title: string; items: { href: string; label: string; perm: Permission }[] }[] = [
  { title: "Overview", items: [{ href: "/admin/dashboard", label: "Dashboard", perm: "enquiries.read" }] },
  {
    title: "Leads",
    items: [{ href: "/admin/enquiries", label: "Franchise enquiries", perm: "enquiries.read" }],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/pages", label: "Pages", perm: "content.manage" },
      { href: "/admin/states", label: "States & cities", perm: "content.manage" },
      { href: "/admin/franchise", label: "Franchise models", perm: "content.manage" },
      { href: "/admin/menus", label: "Menus", perm: "content.manage" },
      { href: "/admin/galleries", label: "Galleries", perm: "content.manage" },
      { href: "/admin/testimonials", label: "Testimonials", perm: "content.manage" },
      { href: "/admin/faqs", label: "FAQs", perm: "content.manage" },
      { href: "/admin/forms", label: "Enquiry forms", perm: "content.manage" },
      { href: "/admin/media", label: "Media library", perm: "media.manage" },
      { href: "/admin/navigation", label: "Navigation", perm: "content.manage" },
      { href: "/admin/seo", label: "SEO & redirects", perm: "content.manage" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/settings", label: "Site settings", perm: "settings.manage" },
      { href: "/admin/users", label: "Users", perm: "users.manage" },
      { href: "/admin/audit-logs", label: "Audit log", perm: "audit.read" },
    ],
  },
];

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser();
  const groups = GROUPS.map((g) => ({ title: g.title, items: g.items.filter((i) => can(user.role, i.perm) || i.href === "/admin/dashboard").map(({ href, label }) => ({ href, label })) })).filter((g) => g.items.length);
  return (
    <div className="admin-ui min-h-dvh bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="bg-slate-900 p-4 text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="mb-6 flex items-center justify-between px-3">
          <Link href="/admin/dashboard" className="font-semibold">
            {BRAND.name} CMS
          </Link>
          <a href="/" target="_blank" rel="noopener" className="text-xs text-slate-400 hover:text-white">
            View site ↗
          </a>
        </div>
        <details className="lg:hidden">
          <summary className="cursor-pointer rounded-md bg-slate-800 px-3 py-2 text-sm">Menu</summary>
          <div className="mt-3">
            <AdminNav groups={groups} />
          </div>
        </details>
        <div className="hidden lg:block">
          <AdminNav groups={groups} />
        </div>
        <div className="mt-8 border-t border-slate-800 px-3 pt-4 text-sm">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS[user.role]}</p>
          <form action={logout} className="mt-3">
            <button type="submit" className="text-sm text-slate-300 underline hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main id="main" className="min-w-0 p-4 sm:p-8">
        <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>{children}</Suspense>
      </main>
    </div>
  );
}
