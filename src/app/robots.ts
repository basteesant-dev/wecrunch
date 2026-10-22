import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return {
    // "*" covers search engines and AI crawlers/agents alike: public pages open, CMS and API closed.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/admin/login", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
