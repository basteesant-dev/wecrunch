import type { MetadataRoute } from "next";
import { getPublicPaths } from "@/lib/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const seen = new Set<string>();
  return (await getPublicPaths())
    .filter((p) => !seen.has(p.path) && seen.add(p.path))
    .map((p) => ({ url: `${base}/${p.path}`, lastModified: p.updatedAt, changeFrequency: "weekly", priority: p.path ? 0.8 : 1 }));
}
