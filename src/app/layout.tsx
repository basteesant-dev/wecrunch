import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, League_Spartan, Poppins } from "next/font/google";
import { getMediaUrl, getSettings } from "@/lib/content";
import { ANALYTICS_ID } from "@/lib/settings-fields";
import "./globals.css";

// Bricolage Grotesque (heavy, tight) for display, Figtree for text.
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700", "800"], display: "swap" });
const body = Figtree({ variable: "--font-figtree", subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap" });
// The printed menu card's fonts: League Spartan for category labels, Poppins for items.
const menuDisplay = League_Spartan({ variable: "--font-league-spartan", subsets: ["latin"], weight: ["700", "800"], display: "swap" });
const menuBody = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  // app/favicon.ico, icon.png and apple-icon.png are the defaults; a CMS favicon replaces them.
  const icon = settings.favicon ? (await getMediaUrl(settings.favicon))?.url : undefined;
  const google = settings.googleVerification.match(/content="([^"]+)"/)?.[1] ?? settings.googleVerification.trim();
  return {
    metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
    title: { default: settings.defaultSeoTitle || settings.siteName, template: settings.titleTemplate || `%s - ${settings.siteName}` },
    description: settings.defaultSeoDescription || undefined,
    applicationName: settings.siteName,
    icons: icon ? { icon, apple: icon } : undefined,
    verification: google ? { google } : undefined,
  };
}

export const viewport: Viewport = { themeColor: "#3a2312", width: "device-width", initialScale: 1 };

import { AttributionTracker } from "@/components/site/AttributionTracker";
import { GtmPageView } from "@/components/site/GtmPageView";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings();
  const gtmId = settings.gtmId && ANALYTICS_ID.test(settings.gtmId) ? settings.gtmId : "";

  return (
    <html lang="en-IN" className={`${display.variable} ${body.variable} ${menuDisplay.variable} ${menuBody.variable} antialiased`}>
      <head>
        {gtmId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`,
            }}
          />
        )}
      </head>
      <body className="min-h-dvh">
        <AttributionTracker />
        {gtmId && <GtmPageView />}
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {children}
      </body>
    </html>
  );
}
