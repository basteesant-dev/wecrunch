import type { Metadata } from "next";
import {
  getCities,
  getNavigation,
  getPublicStates,
  getRefData,
  getSettings,
  type PublicState,
} from "@/lib/content";
import { collectRefs } from "@/lib/sections/refs";
import { resolveContact, resolveSections, type PageSnapshot } from "@/lib/resolve";
import type { SiteSettings } from "@/lib/settings-fields";
import type { CSSProperties } from "react";
import { FOOTER_SURFACE, sectionSurface, SectionView, type Ctx, type Surface } from "./sections";
import { SiteChrome } from "./SiteChrome";

export async function SitePage({ snapshot, state }: { snapshot: PageSnapshot; state: PublicState | null }) {
  const [settings, states, nav, footerNav] = await Promise.all([getSettings(), getPublicStates(), getNavigation("header"), getNavigation("footer")]);
  const sections = resolveSections(snapshot.sections, state?.id);
  const refs = collectRefs(sections);
  const data = await getRefData({ ...refs, media: [...new Set([...refs.media, settings.logo].filter(Boolean))].sort() });
  const cities = state ? (await getCities(state.id)).map((c) => c.name) : [];
  const ctx: Omit<Ctx, "isFirst"> = {
    data,
    contact: resolveContact(settings, snapshot.page, state),
    settings,
    state,
    states,
    cities,
  };
  const anchors = new Set(sections.map((s) => s.settings.anchorId as string).filter(Boolean));
  const surfaces = [...sections.map(sectionSurface), FOOTER_SURFACE];
  const edge = (a: Surface, b: Surface) => (a.solid ? a.color : b.solid ? b.color : `color-mix(in oklab, ${a.color}, ${b.color})`);
  const edges = sections.map(
    (_, i) =>
      ({
        "--edge-top": i > 0 ? edge(surfaces[i - 1], surfaces[i]) : undefined,
        "--edge-bottom": edge(surfaces[i], surfaces[i + 1]),
      }) as CSSProperties,
  );
  return (
    <SiteChrome
      settings={settings}
      contact={ctx.contact}
      logo={data.media[settings.logo]}
      nav={nav}
      footerNav={footerNav}
      anchors={anchors}
      state={state}
    >
      {sections.map((s, i) => (
        // display:contents adds no box; it only hands the edge colours down to the section.
        <div key={s.id} className="contents" style={edges[i]}>
          <SectionView section={s} ctx={{ ...ctx, isFirst: i === 0 }} />
        </div>
      ))}
    </SiteChrome>
  );
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);

/**
 * States without a published landing page (or not yet active) get a simple
 * CMS-driven page: availability message + enquiry form + contact details.
 */
export function stateStatusSnapshot(state: PublicState, settings: SiteSettings): PageSnapshot {
  const defaults: Record<PublicState["status"], string> = {
    ACTIVE: `Share your details and our franchise team will contact you about opportunities in ${state.name}.`,
    ENQUIRY_ONLY: `Share your details and our franchise team will contact you about opportunities in ${state.name}.`,
    COMING_SOON: `${settings.siteName} is coming soon to ${state.name}. Register your interest and our franchise team will reach out.`,
    UNAVAILABLE: `Franchise opportunities are not available in ${state.name} at the moment.`,
  };
  const headings: Record<PublicState["status"], string> = {
    ACTIVE: `${settings.siteName} franchise in ${state.name}`,
    ENQUIRY_ONLY: `${settings.siteName} franchise in ${state.name}`,
    COMING_SOON: `Coming soon to ${state.name}`,
    UNAVAILABLE: `${settings.siteName} in ${state.name}`,
  };
  const message = state.availabilityMessage || defaults[state.status];
  const sections: PageSnapshot["sections"] = [
    {
      id: "status",
      type: "richText",
      key: null,
      isHidden: false,
      stateIds: [],
      content: { heading: headings[state.status], body: message.split(/\n{2,}/).map((p) => `<p>${escapeHtml(p)}</p>`).join("") },
      settings: { variant: "narrow", background: "light", spacing: "md" },
    },
  ];
  if (state.status !== "UNAVAILABLE" && settings.defaultFormId) {
    sections.push({
      id: "form",
      type: "enquiryForm",
      key: null,
      isHidden: false,
      stateIds: [],
      content: { heading: "", highlight: "", text: "", formId: settings.defaultFormId },
      settings: { background: "muted", spacing: "md" },
    });
  }
  return {
    page: { title: headings[state.status], slug: state.slug, seoTitle: null, seoDescription: message, ogImageId: null, canonicalUrl: null, noIndex: false, phone: null, whatsapp: null, email: null },
    sections,
  };
}

export async function pageMetadata(snapshot: PageSnapshot, state: PublicState | null, path: string): Promise<Metadata> {
  const settings = await getSettings();
  const p = snapshot.page;
  // /kerala renders the North page, so its title names the state; /tamilnadu keeps the page title.
  const title = state?.seoTitle || p.seoTitle || (state && state.slug !== p.slug ? `${p.title} — ${state.name}` : p.title);
  const description = state?.seoDescription || p.seoDescription || settings.defaultSeoDescription || undefined;
  const ogId = p.ogImageId || settings.ogImage;
  const og = ogId ? (await getRefData({ media: [ogId], forms: [], menus: [], galleries: [], models: [], testimonials: false, faqs: false })).media[ogId] : undefined;
  const canonical = p.canonicalUrl || path;
  return {
    title: path === "/" ? { absolute: p.seoTitle || settings.defaultSeoTitle || settings.siteName } : title,
    description,
    alternates: { canonical },
    robots: p.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: "website",
      siteName: settings.siteName,
      locale: "en_IN",
      url: canonical,
      title,
      description,
      images: og ? [{ url: og.url, width: og.width ?? undefined, height: og.height ?? undefined, alt: og.alt }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: og ? [og.url] : undefined },
  };
}
