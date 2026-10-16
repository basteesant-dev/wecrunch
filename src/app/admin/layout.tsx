import type { Metadata } from "next";
import { Suspense } from "react";

// CMS screens are per-request and session-bound; they are not meant to be instant/static.
export const instant = false;

export const metadata: Metadata = { title: { default: "CMS", template: "%s · CMS" }, robots: { index: false, follow: false } };

// Everything under /admin depends on the session cookie, so it renders per request.
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<p className="admin-ui min-h-dvh bg-slate-100 p-8 text-sm text-slate-600">Loading…</p>}>{children}</Suspense>
  );
}
