import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import { getMediaUrl, getSettings } from "@/lib/content";
import "./globals.css";

// Bricolage Grotesque (heavy, tight) for display, Figtree for text.
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const body = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const icon = (await getMediaUrl(settings.favicon || settings.logo))?.url;
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: settings.defaultSeoTitle || settings.siteName, template: settings.titleTemplate || `%s - ${settings.siteName}` },
    description: settings.defaultSeoDescription || undefined,
    applicationName: settings.siteName,
    icons: icon ? { icon, apple: icon } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#3a2312", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
