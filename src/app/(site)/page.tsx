import type { Metadata } from "next";
import { SitePage, pageMetadata } from "@/components/site/SitePage";
import { getPublishedPage } from "@/lib/content";
import type { PageSnapshot } from "@/lib/resolve";

export const ensureStatic = "navigation";
export const instant = true;

// Used only until a "home" page is published in the CMS.
const FALLBACK: PageSnapshot = {
  page: { title: "Home", slug: "home", seoTitle: null, seoDescription: null, ogImageId: null, canonicalUrl: null, noIndex: false, phone: null, whatsapp: null, email: null },
  sections: [
    {
      id: "fallback",
      type: "stateSelector",
      key: null,
      isHidden: false,
      stateIds: [],
      content: { heading: "Select your state", description: "", label: "States", placeholder: "- Select -", buttonLabel: "Continue", background: "" },
      settings: {},
    },
  ],
};

async function home() {
  return (await getPublishedPage("home"))?.snapshot ?? FALLBACK;
}

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata(await home(), null, "/");
}

export default async function HomePage() {
  return <SitePage snapshot={await home()} state={null} />;
}
