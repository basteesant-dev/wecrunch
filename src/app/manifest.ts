import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/content";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSettings();
  return {
    name: settings.defaultSeoTitle || settings.siteName,
    short_name: settings.siteName,
    description: settings.defaultSeoDescription || undefined,
    start_url: "/",
    display: "browser",
    background_color: "#fffbef",
    theme_color: "#3a2312",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
