import { NextResponse, type NextRequest } from "next/server";
import { getPublicState } from "@/lib/content";

// State selector target (works without JavaScript): /api/state?state=kerala → /kerala
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("state")?.trim().toLowerCase() ?? "";
  const state = /^[a-z0-9-]{1,80}$/.test(slug) ? await getPublicState(slug) : null;
  const target = state && state.status !== "UNAVAILABLE" ? `/${state.slug}` : "/";
  return NextResponse.redirect(new URL(target, request.url), 303);
}
