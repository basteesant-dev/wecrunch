import { NextResponse, type NextRequest } from "next/server";
import { BRAND } from "@/brand";
import { db } from "@/lib/db";

// CMS-managed redirects (Admin → SEO & redirects). The table is small, so it is
// held in memory and refreshed every minute.
// ponytail: per-instance cache; edits reach other instances within REFRESH_MS.
const REFRESH_MS = 60_000;
let cache: { at: number; map: Map<string, { to: string; permanent: boolean }> } | null = null;

async function redirects() {
  if (!cache || Date.now() - cache.at > REFRESH_MS) {
    const rows = await db.redirect.findMany({ select: { fromPath: true, toPath: true, permanent: true } });
    cache = { at: Date.now(), map: new Map(rows.map((r) => [r.fromPath, { to: r.toPath, permanent: r.permanent }])) };
  }
  return cache.map;
}

// CMS entry: answer with a plain HTTP redirect instead of rendering a page that
// redirects while streaming (slow, and shows a blank "Loading…" first). Only the
// cookie's presence is checked here; every admin page still validates the session.
function adminRedirect(request: NextRequest, path: string) {
  const signedIn = request.cookies.has(BRAND.sessionCookie);
  if (path === "/admin") return NextResponse.redirect(new URL(signedIn ? "/admin/dashboard" : "/admin/login", request.url));
  if (!signedIn && path !== "/admin/login") return NextResponse.redirect(new URL("/admin/login", request.url));
  return NextResponse.next();
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname.replace(/\/+$/, "").toLowerCase() || "/";
  if (path === "/admin" || path.startsWith("/admin/")) return adminRedirect(request, path);
  if (/\.[a-z0-9]+$/.test(path)) return NextResponse.next(); // files (favicon.ico, sitemap.xml, …)
  const hit = (await redirects().catch(() => new Map())).get(path);
  if (!hit) return NextResponse.next();
  return NextResponse.redirect(new URL(hit.to, request.url), hit.permanent ? 308 : 307);
}

export const config = {
  // Public pages plus the CMS entry points; skip framework assets, APIs and media.
  matcher: ["/((?!_next/|api/|media/|admin).*)", "/admin", "/admin/:path*"],
};
