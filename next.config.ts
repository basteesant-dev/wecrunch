import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Inline scripts are allowed because public pages are static (no per-request
// nonce). Third-party hosts are limited to the analytics/captcha/maps we use.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.googletagmanager.com https://connect.facebook.net https://www.clarity.ms https://scripts.clarity.ms https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://connect.facebook.net https://*.facebook.com https://*.clarity.ms https://challenges.cloudflare.com",
  "frame-src 'self' https://maps.google.com https://www.google.com https://challenges.cloudflare.com https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Lets the end-to-end build live beside a running dev server.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Docker builds set NEXT_OUTPUT=standalone (see Dockerfile).
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  cacheComponents: true,
  partialPrefetching: true,
  // Validate instant navigation only where a segment opts in (the static public
  // pages). CMS screens are session-bound and render per request by design.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    formats: ["image/avif", "image/webp"],
    localPatterns: [{ pathname: "/media/**" }],
    // Vercel Blob public store URLs. Always allowed: media URLs are stored in the
    // database, so whether an image can render must not depend on build-time env.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/**" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};

export default nextConfig;
