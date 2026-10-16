import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { emptyValues } from "@/lib/fields";
import type { Question } from "@/lib/forms";
import type { PageSnapshot } from "@/lib/resolve";
import type { RefRequest } from "@/lib/sections/refs";
import { SETTINGS_FIELDS, type SiteSettings } from "@/lib/settings-fields";
import { BRAND } from "@/brand";

// Public, cached reads. Everything here is tagged "cms"; every CMS write calls
// revalidateCms() so visitors see published changes on their next request.
export const CMS_TAG = "cms";

function cms() {
  cacheTag(CMS_TAG);
  cacheLife("hours");
}

export const DEFAULT_SETTINGS = {
  ...emptyValues(SETTINGS_FIELDS),
  siteName: BRAND.name,
  titleTemplate: `%s - ${BRAND.name}`,
  chooseStateText: "Change state",
} as SiteSettings;

export async function getSettings(): Promise<SiteSettings> {
  "use cache";
  cms();
  const row = await db.siteSetting.findUnique({ where: { id: "site" } });
  return { ...DEFAULT_SETTINGS, ...((row?.data as Partial<SiteSettings>) ?? {}) };
}

export async function getPublishedPage(slug: string): Promise<{ id: string; snapshot: PageSnapshot } | null> {
  "use cache";
  cms();
  const page = await db.page.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { id: true, revisions: { where: { status: "PUBLISHED" }, select: { snapshot: true }, take: 1 } },
  });
  const rev = page?.revisions[0];
  return page && rev ? { id: page.id, snapshot: rev.snapshot as PageSnapshot } : null;
}

export type PublicState = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "ENQUIRY_ONLY" | "COMING_SOON" | "UNAVAILABLE";
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  availabilityMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  landingSlug: string | null;
};

export async function getPublicStates(): Promise<PublicState[]> {
  "use cache";
  cms();
  const states = await db.state.findMany({
    where: { status: { not: "DRAFT" } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { landingPage: { select: { slug: true } } },
  });
  return states.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status as PublicState["status"],
    phone: s.phone,
    whatsapp: s.whatsapp,
    email: s.email,
    availabilityMessage: s.availabilityMessage,
    seoTitle: s.seoTitle,
    seoDescription: s.seoDescription,
    landingSlug: s.landingPage?.slug ?? null,
  }));
}

export async function getPublicState(slug: string) {
  return (await getPublicStates()).find((s) => s.slug === slug) ?? null;
}

export async function getCities(stateId: string) {
  "use cache";
  cms();
  return db.city.findMany({
    where: { stateId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { name: true },
  });
}

export async function getNavigation(key: string) {
  "use cache";
  cms();
  const menu = await db.navigationMenu.findUnique({
    where: { key },
    include: { items: { where: { isVisible: true }, orderBy: { sortOrder: "asc" } } },
  });
  return menu?.items.map(({ label, href, openInNewTab }) => ({ label, href, openInNewTab })) ?? [];
}

/** All public URL paths (without leading slash), for static generation and the sitemap. */
export async function getPublicPaths() {
  "use cache";
  cms();
  const [pages, states] = await Promise.all([
    db.page.findMany({ where: { status: "PUBLISHED", noIndex: false }, select: { slug: true, updatedAt: true } }),
    db.state.findMany({ where: { status: { not: "DRAFT" } }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...pages.map((p) => ({ path: p.slug === "home" ? "" : p.slug, updatedAt: p.updatedAt })),
    ...states.map((s) => ({ path: s.slug, updatedAt: s.updatedAt })),
  ];
}

export type Media = { url: string; alt: string; width: number | null; height: number | null; mimeType: string };
export type FormDef = {
  id: string;
  title: string;
  submitLabel: string;
  successMessage: string;
  questions: Question[];
  showState: boolean;
  showMessage: boolean;
  requireConsent: boolean;
  consentText: string | null;
};
export type MenuDef = { name: string; categories: { name: string; items: { name: string; description: string | null; price: string | null }[] }[] };
export type GalleryDef = { name: string; items: { mediaId: string; caption: string | null }[] };
export type ModelDef = {
  name: string;
  totalInvestment: string;
  area: string | null;
  expansion: string | null;
  roi: string | null;
  payback: string | null;
  royalty: string | null;
  breakdown: { label: string; value: string; note: string | null; icon: string | null }[];
};
export type TestimonialDef = { id: string; name: string; location: string | null; quote: string; rating: number; photoId: string | null; tag: string | null };
export type FaqDef = { id: string; question: string; answer: string; tag: string | null };

export type RefData = {
  media: Record<string, Media>;
  forms: Record<string, FormDef>;
  menus: Record<string, MenuDef>;
  galleries: Record<string, GalleryDef>;
  models: Record<string, ModelDef>;
  testimonials: TestimonialDef[];
  faqs: FaqDef[];
};

/** Loads everything a page's sections reference in a handful of queries. */
export async function getRefData(req: RefRequest): Promise<RefData> {
  "use cache";
  cms();
  const [forms, menus, galleries, models, testimonials, faqs] = await Promise.all([
    req.forms.length ? db.enquiryForm.findMany({ where: { id: { in: req.forms } } }) : [],
    req.menus.length
      ? db.menu.findMany({
          where: { id: { in: req.menus }, isPublished: true },
          include: { categories: { orderBy: { sortOrder: "asc" }, include: { items: { where: { isAvailable: true }, orderBy: { sortOrder: "asc" } } } } },
        })
      : [],
    req.galleries.length
      ? db.gallery.findMany({ where: { id: { in: req.galleries } }, include: { items: { orderBy: { sortOrder: "asc" } } } })
      : [],
    req.models.length
      ? db.franchiseModel.findMany({ where: { id: { in: req.models }, isPublished: true }, include: { breakdown: { orderBy: { sortOrder: "asc" } } } })
      : [],
    req.testimonials ? db.testimonial.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }) : [],
    req.faqs ? db.faq.findMany({ where: { isPublished: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }) : [],
  ]);

  const mediaIds = new Set(req.media);
  for (const g of galleries) for (const i of g.items) mediaIds.add(i.mediaId);
  for (const t of testimonials) if (t.photoId) mediaIds.add(t.photoId);
  const media = mediaIds.size
    ? await db.mediaAsset.findMany({ where: { id: { in: [...mediaIds] } }, select: { id: true, url: true, alt: true, width: true, height: true, mimeType: true } })
    : [];

  return {
    media: Object.fromEntries(media.map(({ id, ...m }) => [id, m])),
    forms: Object.fromEntries(
      forms.map((f) => [
        f.id,
        {
          id: f.id,
          title: f.title,
          submitLabel: f.submitLabel,
          successMessage: f.successMessage,
          questions: f.fields as Question[],
          showState: f.showState,
          showMessage: f.showMessage,
          requireConsent: f.requireConsent,
          consentText: f.consentText,
        },
      ]),
    ),
    menus: Object.fromEntries(
      menus.map((m) => [
        m.id,
        {
          name: m.name,
          categories: m.categories.map((c) => ({
            name: c.name,
            items: c.items.map((i) => ({ name: i.name, description: i.description, price: i.price?.toFixed(2) ?? null })),
          })),
        },
      ]),
    ),
    galleries: Object.fromEntries(galleries.map((g) => [g.id, { name: g.name, items: g.items.map((i) => ({ mediaId: i.mediaId, caption: i.caption })) }])),
    models: Object.fromEntries(
      models.map((m) => [
        m.id,
        {
          name: m.name,
          totalInvestment: m.totalInvestment,
          area: m.area,
          expansion: m.expansion,
          roi: m.roi,
          payback: m.payback,
          royalty: m.royalty,
          breakdown: m.breakdown.map(({ label, value, note, icon }) => ({ label, value, note, icon })),
        },
      ]),
    ),
    testimonials: testimonials.map(({ id, name, location, quote, rating, photoId, tag }) => ({ id, name, location, quote, rating, photoId, tag })),
    faqs: faqs.map(({ id, question, answer, tag }) => ({ id, question, answer, tag })),
  };
}

export async function getMediaUrl(id: string | null | undefined) {
  if (!id) return null;
  const { media } = await getRefData({ media: [id], forms: [], menus: [], galleries: [], models: [], testimonials: false, faqs: false });
  return media[id] ?? null;
}
