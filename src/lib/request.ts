import { headers } from "next/headers";

// Assumes the app runs behind a trusted reverse proxy / platform that sets
// X-Forwarded-For (Vercel, Nginx, Cloudflare). See docs/DEPLOYMENT.md.
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}

export async function userAgent() {
  return (await headers()).get("user-agent")?.slice(0, 300) ?? null;
}

// Same-origin check for state-changing route handlers (server actions already
// verify Origin themselves). Cookies are SameSite=Lax as a second layer.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
