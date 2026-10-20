import { Check, Drumstick, FileImage, Mail, MapPin, Phone, Star } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { PublicState, RefData } from "@/lib/content";
import { displayPhone, telHref } from "@/lib/phone";
import type { Contact, SnapshotSection } from "@/lib/resolve";
import type { SiteSettings } from "@/lib/settings-fields";
import { Counter } from "./Counter";
import { EnquiryForm } from "./EnquiryForm";
import { HeroParallax } from "./HeroParallax";
import { RoiCalculator } from "./RoiCalculator";
import { Icon } from "./Icon";
import { Scroller } from "./Scroller";
import { Container, Highlighted, MediaImage, RichText, Section, SectionHeading, TONE_COLOR, toneOf, type Tone } from "./ui";

export type Ctx = {
  data: RefData;
  contact: Contact;
  settings: SiteSettings;
  state: PublicState | null;
  states: PublicState[];
  cities: string[];
  isFirst: boolean;
};

// Section content was validated against the registry before it was saved and
// published, so renderers read fields directly.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = { c: any; s: Record<string, any>; ctx: Ctx };

const TILT = [-3, 2, -1.5, 3, -2.5, 1.5];

function Form({ formId, ctx, title, compact }: { formId: string; ctx: Ctx; title?: string; compact?: boolean }) {
  const form = ctx.data.forms[formId];
  if (!form) return null;
  return (
    <EnquiryForm
      form={form}
      title={title}
      variant="card"
      compact={compact}
      states={ctx.states.map(({ slug, name, status }) => ({ slug, name, status }))}
      defaultState={ctx.state?.slug}
      cities={ctx.cities}
    />
  );
}

function CallButton({ phone, tone = "ketchup" }: { phone: string; tone?: "ketchup" | "yolk" }) {
  if (!phone) return null;
  return (
    <a
      href={telHref(phone)}
      className={`inline-flex min-h-12 items-center gap-3 rounded-xl border-3 border-crust px-6 text-lg font-bold shadow-box-sm transition active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
        tone === "ketchup" ? "bg-ketchup text-white hover:bg-ketchup-deep" : "bg-yolk text-crust hover:bg-[#ffe14d]"
      }`}
    >
      <Phone className="size-5" aria-hidden="true" />
      Call {displayPhone(phone)}
    </a>
  );
}

// ---------------------------------------------------------------- hero

// Investment as a rotating seal: "3.80L" large, "+ GST" small, with the
// takeaway-box hard shadow. Reads "₹3.80 Lakhs + GST" text from the CMS.
function PriceSeal({ text }: { text: string }) {
  const m = /([\d.,]+)\s*(?:L|Lakhs?|Lacs?)\b\s*(.*)$/i.exec(text);
  const points = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const r = i % 2 ? 45 : 50;
    return `${(50 + r * Math.cos(a)).toFixed(2)},${(50 + r * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return (
    <div className="relative grid size-44 shrink-0 place-items-center sm:size-52 short:size-40" role="img" aria-label={`Investment ${text}`}>
      <svg viewBox="0 0 100 100" aria-hidden="true" className="seal-spin absolute inset-0 size-full drop-shadow-[4px_4px_0_var(--color-crust)]">
        <polygon points={points} fill="var(--color-ketchup)" stroke="var(--color-crust)" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--color-yolk)" strokeWidth="1" strokeDasharray="2.2 2.4" />
      </svg>
      <div className="relative text-center leading-none text-white" aria-hidden="true">
        <p className="font-display text-[0.72rem] font-extrabold uppercase tracking-[0.14em] text-yolk sm:text-[0.82rem]">Investment</p>
        {m ? (
          <>
            <p className="mt-1.5 font-display text-[3rem] font-extrabold tracking-tight sm:text-[3.5rem] short:text-[2.75rem]">
              {m[1]}
              <span className="text-[0.8em]">L</span>
            </p>
            {m[2] && <p className="mt-1 font-display text-base font-bold uppercase tracking-wider sm:text-lg">{m[2]}</p>}
          </>
        ) : (
          <p className="mt-1.5 px-3 font-display text-base font-extrabold">{text}</p>
        )}
      </div>
    </div>
  );
}

function Hero({ c, s, ctx }: Props) {
  const photo = ctx.data.media[c.background];
  const hasForm = s.variant !== "centered" && !!ctx.data.forms[c.formId];
  return (
    <section id={s.anchorId || undefined} className="hero relative isolate overflow-hidden bg-yolk pb-16 text-crust">
      <HeroParallax />
      {hasForm && photo && (
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="hero-photo absolute inset-0">
            <MediaImage media={photo} fill priority sizes="100vw" alt="" className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-yolk via-yolk/95 to-yolk/80 lg:bg-gradient-to-r lg:from-yolk lg:via-yolk/[0.94] lg:to-yolk/30" />
        </div>
      )}
      {/* After the photo so it paints over it. */}
      <div aria-hidden="true" className="blend-bottom pointer-events-none absolute inset-x-0 bottom-0 -z-10" />
      <Container
        className={`grid gap-12 pt-12 md:pt-16 ${hasForm ? "lg:min-h-[calc(100svh-6rem-3px)] lg:grid-cols-[1fr_34rem] lg:items-center lg:gap-14 lg:pt-6" : ""}`}
      >
        {/* Brand line across the whole hero, one line from laptop width up. */}
        {c.backdropText && (
          <p className={`font-display text-[clamp(1.15rem,0.5rem+1.6vw,2.4rem)] font-extrabold uppercase leading-tight tracking-[0.04em] lg:whitespace-nowrap ${hasForm ? "lg:col-span-2 lg:-mb-8 short:-mb-10" : ""}`}>
            {c.backdropText.split(/(?<=[.!?])\s+/).join(" ")}
          </p>
        )}
        <div className="@container hero-copy relative">
          {c.tagline && (
            <p className="sticker absolute right-0 top-[3.5rem] z-10 size-32 rotate-[-10deg] bg-fresh p-3 text-lg text-white shadow-box-sm sm:top-0 sm:size-40 sm:text-[1.35rem] lg:-right-4 short:size-32 short:text-lg">
              {c.tagline}
            </p>
          )}
          {c.eyebrow && <p className="inline-block rounded-full bg-crust px-4 py-1.5 font-bold text-yolk">{c.eyebrow}</p>}
          <h1 className={`mt-5 max-w-[13ch] pr-32 text-mega sm:pr-40 ${hasForm ? "lg:max-w-[15ch] lg:text-[clamp(2.6rem,0.8rem+3.6vw,4.6rem)] short:mt-3 short:text-[3.1rem]!" : ""}`}>
            <Highlighted text={c.heading} highlight={c.highlight} />
          </h1>
          <div className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-5 short:mt-4">
            {c.priceTag && <PriceSeal text={c.priceTag} />}
            <div className="flex flex-col items-start gap-3">
              {c.showPhoneCta && <CallButton phone={ctx.contact.phone} />}
              {hasForm && (
                <a href="#enquiry" className="font-bold underline decoration-3 underline-offset-4 lg:hidden">
                  Send an enquiry
                </a>
              )}
            </div>
          </div>
          {!hasForm && photo && (
            <div className="box relative mt-10 aspect-[16/9] rotate-[1.2deg] overflow-hidden bg-crust">
              <MediaImage media={photo} fill priority sizes="(min-width: 1024px) 640px, 100vw" alt="" className="object-cover" />
            </div>
          )}
        </div>
        {hasForm && (
          // Bounded to the viewport (scrolls inside on short screens); padding keeps the hard shadow visible.
          <div id="enquiry" className="hero-form w-full max-w-xl justify-self-center overscroll-contain pb-2 pr-2 lg:max-h-[calc(100svh-8rem)] lg:justify-self-end lg:overflow-y-auto">
            <Form formId={c.formId} ctx={ctx} title={c.formTitle} compact />
          </div>
        )}
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------- story

function Features({ c, s, ctx }: Props) {
  return (
    <Section settings={s} tone="batter">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} as={ctx.isFirst ? "h1" : "h2"} />
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {c.items.map((it: any, i: number) => (
            <li key={i} className="box-flat flex flex-col gap-4 bg-white p-5">
              <span className="grid size-12 place-items-center rounded-full border-3 border-crust bg-yolk">
                <Icon name={it.icon} className="size-5" />
              </span>
              <span className="text-lg font-semibold leading-snug">{it.text}</span>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

function About({ c, s, ctx }: Props) {
  const img = ctx.data.media[c.image];
  return (
    <Section settings={s} tone="crust">
      <Container className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
        {img && (
          <div className={`relative ${c.imagePosition === "right" ? "md:order-2" : ""}`}>
            <div className="relative aspect-[4/3] -rotate-2 overflow-hidden rounded-2xl border-4 border-yolk shadow-box-yolk">
              <MediaImage media={img} fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
            </div>
          </div>
        )}
        <div>
          <SectionHeading heading={c.heading} highlight={c.highlight} as={ctx.isFirst ? "h1" : "h2"} />
          <RichText html={c.body} className="text-lg text-batter/85" />
        </div>
      </Container>
    </Section>
  );
}

function Band({ c }: Props) {
  const items: string[] = c.items.map((i: any) => i.text);
  if (!items.length) return null;
  const base: string[] = [];
  while (base.length < 10) base.push(...items);
  const alt = !!c.reverse;
  return (
    <div className={`overflow-hidden py-4 ${alt ? "bg-yolk text-crust" : "bg-ketchup text-yolk"}`} role="marquee" aria-label={items.join(", ")}>
      <ul className={`flex w-max ${alt ? "animate-band-reverse" : "animate-band"}`} aria-hidden="true">
        {[...base, ...base].map((t, i) => (
          <li key={i} className="flex items-center gap-6 whitespace-nowrap pr-6 font-display text-2xl font-extrabold md:text-3xl">
            {t}
            <Drumstick className="size-6" />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- numbers

function Stats({ c, s }: Props) {
  return (
    <Section settings={s} tone="yolk">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} align="center" />
        <dl className="grid grid-cols-2 justify-items-center gap-6 sm:gap-10 lg:grid-cols-4">
          {c.items.map((it: any, i: number) => (
            <div key={i} className="sticker aspect-square w-full max-w-60 bg-white shadow-box" style={{ transform: `rotate(${TILT[i % TILT.length]}deg)` }}>
              <div className="flex flex-col-reverse items-center px-4">
                <dt className="mt-2 font-body text-base font-semibold sm:text-lg">{it.label}</dt>
                <dd className={String(it.value).length > 4 ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}>
                  <Counter value={it.value} />
                  {it.suffix}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}

function FranchiseFacts({ c, s, ctx }: Props) {
  const m = ctx.data.models[c.modelId];
  if (!m) return null;
  const facts = [
    ["Coins", "Total investment", m.totalInvestment],
    ["Building2", "Area", m.area],
    ["Maximize2", "Expansion", m.expansion],
    ["IndianRupee", "ROI", m.roi],
    ["CalendarDays", "Pay back period", m.payback],
    ...(c.showRoyalty ? [["Award", "Royalty", m.royalty]] : []),
  ].filter((f): f is [string, string, string] => !!f[2]);
  return (
    <Section settings={s} tone="batter">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} />
        {c.intro && <RichText html={c.intro} className="-mt-4 mb-10 max-w-2xl text-lg" />}
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facts.map(([icon, title, value], i) => (
            <div key={title} className={`box-flat flex gap-4 p-5 ${i === 0 ? "bg-yolk" : "bg-white"}`}>
              <Icon name={icon} className="mt-1 size-6 shrink-0" />
              <div>
                <dt className="font-semibold text-crust-soft">{title}</dt>
                <dd className="mt-1 font-display text-2xl font-extrabold leading-tight">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </Section>
  );
}

function Investment({ c, s, ctx }: Props) {
  const m = ctx.data.models[c.modelId];
  if (!m) return null;
  const total = m.breakdown.find((b) => /total/i.test(b.label));
  const rows = m.breakdown.filter((b) => b !== total);
  return (
    <Section settings={s} tone="batter">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} />
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((b, i) => {
            // A cost outside the total (note says "not included") is flagged so nobody adds it in.
            const extra = /not included/i.test(b.note ?? "");
            return (
              <div key={i} className={`box-flat relative flex flex-col p-5 ${extra ? "bg-ketchup text-white" : "bg-white"}`}>
                {extra && <span className="sticker absolute -top-5 right-4 size-14 rotate-12 bg-yolk text-sm text-crust">Extra</span>}
                <dt className={`flex items-center gap-2 font-semibold ${extra ? "text-white/90" : "text-crust-soft"}`}>
                  <Icon name={b.icon} className="size-5" />
                  {b.label}
                </dt>
                <dd className="mt-3 font-display text-2xl font-extrabold leading-tight">{b.value}</dd>
                {b.note && <dd className={`mt-1 text-sm ${extra ? "font-bold" : "text-crust-soft"}`}>{b.note}</dd>}
              </div>
            );
          })}
          {total && (
            <div className="box relative mt-4 flex flex-wrap items-end justify-between gap-4 bg-yolk p-6 sm:col-span-2 lg:col-span-4">
              <dt className="sticker absolute -top-6 left-5 size-16 -rotate-12 bg-ketchup text-sm text-white">Total</dt>
              <dd className="pt-6 font-display text-[clamp(2.4rem,1.6rem+3vw,4rem)] font-extrabold leading-none">{total.value}</dd>
              <dd className="font-semibold">
                {total.label}
                {total.note && <span className="block text-sm font-normal">{total.note}</span>}
              </dd>
            </div>
          )}
        </dl>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------- partners, photos, video

function Checklist({ c, s }: Props) {
  return (
    <Section settings={s} tone="ketchup">
      <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <SectionHeading eyebrow={c.eyebrow} heading={c.heading} highlight={c.highlight} />
        <ul className="space-y-4">
          {c.items.map((it: any, i: number) => (
            <li key={i} className="flex items-center gap-4 text-xl font-semibold">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-3 border-crust bg-yolk text-crust">
                <Check className="size-5" strokeWidth={3} aria-hidden="true" />
              </span>
              {it.text}
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}

function Gallery({ c, s, ctx }: Props) {
  const g = ctx.data.galleries[c.galleryId];
  if (!g?.items.length) return null;
  const portrait = s.variant !== "landscape";
  return (
    <Section settings={s} tone="crust">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} />
        <ul className={`grid gap-8 ${g.items.length > 2 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"} ${portrait ? "mx-auto max-w-4xl" : ""}`}>
          {g.items.map((it, i) => {
            const m = ctx.data.media[it.mediaId];
            if (!m) return null;
            return (
              <li key={i} style={{ transform: `rotate(${TILT[i % TILT.length] / 2}deg)` }}>
                <a href={m.url} target="_blank" rel="noopener" className="block overflow-hidden rounded-2xl border-4 border-white shadow-box-yolk" aria-label={`Open photo: ${it.caption || m.alt}`}>
                  <MediaImage media={m} alt={it.caption || m.alt} sizes="(min-width: 640px) 50vw, 100vw" className={`w-full object-cover ${portrait ? "aspect-[3/4]" : "aspect-[4/3]"}`} />
                </a>
                {it.caption && <p className="mt-3 font-semibold">{it.caption}</p>}
              </li>
            );
          })}
        </ul>
      </Container>
    </Section>
  );
}

function Videos({ c, s, ctx }: Props) {
  const items = c.items.filter((v: any) => ctx.data.media[v.video]);
  if (!items.length) return null;
  const reels = items.map((v: any, i: number) => (
    <div key={i} className="w-60 shrink-0 snap-start overflow-hidden rounded-3xl border-4 border-yolk bg-crust shadow-box-yolk sm:w-64">
      <video
        src={ctx.data.media[v.video].url}
        poster={ctx.data.media[v.poster]?.url}
        controls
        playsInline
        preload="metadata"
        aria-label={v.title || "Video"}
        className="aspect-[9/16] w-full object-cover"
      />
    </div>
  ));
  return (
    <Section settings={s} tone="crust">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} />
        {items.length > 4 ? <Scroller label="videos">{reels}</Scroller> : <div className="flex flex-wrap justify-center gap-8">{reels}</div>}
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------- ROI

function Roi({ c, s }: Props) {
  return (
    <Section settings={s} tone="crust">
      <Container>
        <SectionHeading eyebrow={c.eyebrow} heading={c.heading} highlight={c.highlight} />
        {c.intro && <p className="-mt-6 mb-10 max-w-2xl text-xl opacity-85">{c.intro}</p>}
        <RoiCalculator config={c} />
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------- menu

// Category photos from the printed menu card, matched by category name (first
// match wins), so a category added in the CMS simply shows without one.
const MENU_PHOTOS: [RegExp, string, number, number][] = [
  [/veg burger combo/i, "veg-combo", 420, 414],
  [/burger combo|family feast 1/i, "feast", 420, 257],
  [/family feast/i, "platter", 420, 190],
  [/combo/i, "combos", 420, 196],
  [/nashville/i, "nashville", 420, 329],
  [/burger/i, "burger", 420, 385],
  [/crunchy chicken/i, "crunchy-chicken", 420, 263],
  [/n-?veg|non.?veg/i, "snack-nonveg", 420, 227],
  [/snack veg/i, "fries", 229, 534],
  [/mojito/i, "mojito", 290, 518],
  [/wrap/i, "wrap", 420, 367],
  [/shake/i, "shakes", 330, 439],
  [/dessert/i, "dessert", 191, 115],
];

function MenuCard({ c, s, ctx }: Props) {
  const img = ctx.data.media[c.image];
  const menu = ctx.data.menus[c.menuId];
  const phones = [ctx.settings.phone, ctx.settings.phoneSecondary].filter(Boolean);
  return (
    <Section settings={s} tone="yolk" className="menu-board">
      <Container>
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div className="-mb-12">
            <SectionHeading heading={c.heading} highlight={c.highlight} />
          </div>
          {img && menu && (
            <a href={img.url} target="_blank" rel="noopener" className="box-flat inline-flex min-h-11 items-center gap-2.5 bg-white px-4 font-bold hover:bg-batter">
              <FileImage className="size-5" aria-hidden="true" />
              View the printed menu card
            </a>
          )}
        </div>
        {menu ? (
          <div className="menu-type mt-14 columns-1 gap-12 sm:columns-2 lg:columns-3">
            {menu.categories.map((cat) => {
              const photo = MENU_PHOTOS.find(([re]) => re.test(cat.name));
              return (
                <div key={cat.name} className="mb-10 break-inside-avoid">
                  <div className="flex min-h-20 items-center justify-between gap-2">
                    <h3 className="menu-brush text-[clamp(1.25rem,1.1rem+0.4vw,1.5rem)] text-balance">{cat.name}</h3>
                    {photo && (
                      <Image
                        src={`/menu/${photo[1]}.webp`}
                        alt=""
                        width={photo[2]}
                        height={photo[3]}
                        sizes="160px"
                        className="-my-2 h-24 w-auto max-w-[38%] shrink-0 object-contain drop-shadow-[0_6px_6px_rgb(0_0_0/0.25)]"
                      />
                    )}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {cat.items.map((it) => (
                      <li key={it.name} className="flex items-baseline justify-between gap-4 uppercase leading-snug">
                        <span className="min-w-0">
                          <span className={it.description ? "font-extrabold" : ""}>{it.name}</span>
                          {it.description && <span className="mt-0.5 block text-[0.85em]">{it.description}</span>}
                        </span>
                        {it.price && (
                          <span className="shrink-0 tabular-nums">
                            <span className="sr-only">₹</span>
                            {Number(it.price).toFixed(0)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
            <div className="box break-inside-avoid bg-crust px-6 py-8 text-center text-white">
              <Image src="/menu/logo.webp" alt={ctx.settings.siteName} width={600} height={312} sizes="220px" className="mx-auto h-auto w-[13.5rem]" />
              {(c.panelTitle || c.panelSubtitle) && (
                <p className="mt-3 font-[family-name:var(--font-league-spartan)] text-[1.7rem] font-extrabold uppercase leading-[1.05] text-yolk">
                  {c.panelTitle}
                  {c.panelSubtitle && <span className="block">{c.panelSubtitle}</span>}
                </p>
              )}
              {c.panelNote && <p className="mt-5 uppercase tracking-wider">{c.panelNote}</p>}
              <div className="mt-3 flex flex-col items-center gap-2.5">
                {phones.map((p) => (
                  <a key={p} href={telHref(p)} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-yolk px-5 font-bold tabular-nums text-crust hover:bg-white">
                    <Phone className="size-4" aria-hidden="true" />
                    {displayPhone(p)}
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          img && <MediaImage media={img} sizes="(min-width: 1216px) 1152px, 100vw" className="box mt-10 w-full" />
        )}
      </Container>
    </Section>
  );
}

function MenuShowcase({ c, s, ctx }: Props) {
  const items = c.items.filter((it: any) => ctx.data.media[it.image]);
  return (
    <Section settings={s} tone="yolk">
      <Container>
        <SectionHeading heading={c.heading} highlight={c.highlight} />
        <Scroller label="menu photos">
          {items.map((it: any, i: number) => {
            const m = ctx.data.media[it.image];
            return (
              <figure key={i} className="w-56 shrink-0 snap-start py-3 sm:w-64" style={{ transform: `rotate(${TILT[i % TILT.length] / 1.5}deg)` }}>
                <div className="relative aspect-square overflow-hidden rounded-2xl border-[6px] border-white shadow-box">
                  <MediaImage media={m} fill alt={it.label || m.alt} sizes="256px" className="object-cover" />
                </div>
                {it.label && <figcaption className="mt-4 font-display text-xl font-extrabold leading-tight">{it.label}</figcaption>}
              </figure>
            );
          })}
        </Scroller>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------- voices

function pick<T extends { id: string; tag: string | null }>(all: T[], c: any, idsKey: string) {
  if (c.source === "selected") return (c[idsKey] as string[]).map((id) => all.find((x) => x.id === id)).filter((x): x is T => !!x);
  if (c.source === "tag") return all.filter((x) => x.tag === c.tag);
  return all;
}

function Testimonials({ c, s, ctx }: Props) {
  const items = pick(ctx.data.testimonials, c, "testimonialIds");
  if (!items.length) return null;
  return (
    <Section settings={s} tone="batter">
      <Container>
        <SectionHeading eyebrow={c.eyebrow} heading={c.heading} highlight={c.highlight} />
        <div className="grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t, i) => (
            <figure key={t.id}>
              <blockquote className={`bubble box-flat p-6 text-lg leading-relaxed ${i % 2 ? "bg-yolk-soft" : "bg-white"}`}>{t.quote}</blockquote>
              <figcaption className="mt-6 flex items-center gap-3 pl-3">
                <span className="sticker size-11 bg-yolk text-lg" aria-hidden="true">
                  {t.name.charAt(0)}
                </span>
                <span>
                  <span className="block font-bold">{t.name}</span>
                  {t.location && <span className="block text-sm text-crust-soft">{t.location}</span>}
                </span>
                <span className="ml-auto flex gap-0.5" role="img" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }, (_, n) => (
                    <Star key={n} className={`size-4 ${n < t.rating ? "fill-ketchup text-ketchup" : "opacity-25"}`} aria-hidden="true" />
                  ))}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </Section>
  );
}

function Faq({ c, s, ctx }: Props) {
  const items = pick(ctx.data.faqs, c, "faqIds");
  if (!items.length) return null;
  return (
    <Section settings={s} tone="batter">
      <Container className="max-w-3xl">
        <SectionHeading heading={c.heading} highlight={c.highlight} as={ctx.isFirst ? "h1" : "h2"} />
        <div className="space-y-3">
          {items.map((f) => (
            <details key={f.id} className="group box-flat bg-white p-5">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-lg font-bold">
                {f.question}
                <span className="sticker size-8 shrink-0 bg-yolk text-lg transition group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <RichText html={f.answer} className="mt-3" />
            </details>
          ))}
        </div>
      </Container>
    </Section>
  );
}

// ---------------------------------------------------------------- generic blocks

function RichTextSection({ c, s, ctx }: Props) {
  return (
    <Section settings={s} tone="batter">
      <Container className={s.variant === "wide" ? "" : "max-w-3xl"}>
        {c.heading && <SectionHeading heading={c.heading} as={ctx.isFirst ? "h1" : "h2"} />}
        <RichText html={c.body} className="text-lg" />
      </Container>
    </Section>
  );
}

function Cta({ c, s, ctx }: Props) {
  const img = ctx.data.media[c.image];
  return (
    <Section settings={s} tone="ketchup">
      <Container className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
        <div>
          <h2 className="text-title">{c.heading}</h2>
          {c.text && <p className="mt-3 max-w-2xl text-xl">{c.text}</p>}
        </div>
        <div className="flex items-center gap-6">
          {img && <MediaImage media={img} sizes="144px" className="hidden size-36 rounded-full border-4 border-white object-cover md:block" />}
          {c.buttonLabel && c.buttonHref && (
            <a href={c.buttonHref} className="box inline-flex min-h-12 items-center bg-yolk px-7 text-lg font-bold text-crust">
              {c.buttonLabel}
            </a>
          )}
        </div>
      </Container>
    </Section>
  );
}

function EnquirySection({ c, s, ctx }: Props) {
  return (
    <Section settings={s} tone="yolk">
      <Container className="grid items-start gap-10 lg:grid-cols-[1fr_28rem] lg:gap-16">
        <div>
          <SectionHeading heading={c.heading || "Franchise enquiry"} highlight={c.highlight} as={ctx.isFirst ? "h1" : "h2"} />
          {c.text && <p className="max-w-lg text-xl">{c.text}</p>}
          <div className="mt-8">
            <CallButton phone={ctx.contact.phone} />
          </div>
        </div>
        <Form formId={c.formId} ctx={ctx} />
      </Container>
    </Section>
  );
}

export function ContactDetails({ ctx }: { ctx: Pick<Ctx, "contact" | "settings"> }) {
  const { contact, settings } = ctx;
  const phones = [contact.phone, settings.phoneSecondary].filter(Boolean);
  const row = "flex items-start gap-3 text-lg";
  const icon = "mt-1 size-5 shrink-0 text-yolk";
  return (
    <address className="space-y-4 not-italic">
      {settings.address && (
        <p className={`${row} whitespace-pre-line leading-relaxed`}>
          <MapPin className={icon} aria-hidden="true" />
          {settings.address}
        </p>
      )}
      {phones.length > 0 && (
        <p className={row}>
          <Phone className={icon} aria-hidden="true" />
          <span className="flex flex-wrap gap-x-4">
            {phones.map((p) => (
              <a key={p} href={telHref(p)} className="hover:underline">
                {displayPhone(p)}
              </a>
            ))}
          </span>
        </p>
      )}
      {contact.email && (
        <p className={row}>
          <Mail className={icon} aria-hidden="true" />
          <a href={`mailto:${contact.email}`} className="[overflow-wrap:anywhere] hover:underline">
            {contact.email}
          </a>
        </p>
      )}
    </address>
  );
}

export function MapEmbed({ query, className = "" }: { query: string; className?: string }) {
  if (!query) return null;
  return (
    <iframe
      title="Map showing our office location"
      src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=m&z=14&output=embed&iwloc=near`}
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      className={`h-64 w-full rounded-2xl border-4 border-yolk ${className}`}
    />
  );
}

function ContactSection({ c, s, ctx }: Props) {
  return (
    <Section settings={s} tone="crust">
      <Container className="grid items-center gap-10 md:grid-cols-2">
        <div>
          <SectionHeading heading={c.heading} highlight={c.highlight} as={ctx.isFirst ? "h1" : "h2"} />
          <ContactDetails ctx={ctx} />
        </div>
        {c.showMap && <MapEmbed query={ctx.settings.mapQuery || ctx.settings.address} />}
      </Container>
    </Section>
  );
}

function StateSelector({ c, ctx }: Props) {
  const photo = ctx.data.media[c.background];
  const selectable = ctx.states.filter((st) => st.status !== "UNAVAILABLE");
  return (
    <section className="relative isolate overflow-hidden bg-yolk pb-16 text-crust">
      <div aria-hidden="true" className="blend-bottom pointer-events-none absolute inset-x-0 bottom-0 -z-10" />
      <Container className="grid min-h-[calc(100svh-6rem)] grid-cols-1 items-center gap-12 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <form action="/api/state" method="get" className="w-full min-w-0 max-w-xl">
          {c.heading && <h1 className="text-mega [overflow-wrap:anywhere]">{c.heading}</h1>}
          {c.description && <p className="mt-5 text-xl font-medium">{c.description}</p>}
          <div className="box mt-10 bg-white p-4 sm:p-5">
            <label htmlFor="state-select" className="block text-lg font-bold">
              {c.label}
            </label>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <select
                id="state-select"
                name="state"
                required
                defaultValue=""
                className="min-h-13 w-full min-w-0 flex-1 rounded-control border-3 border-crust bg-batter px-4 text-lg"
              >
                <option value="" disabled>
                  {c.placeholder || "- Select -"}
                </option>
                {selectable.map((st) => (
                  <option key={st.slug} value={st.slug}>
                    {st.name}
                  </option>
                ))}
              </select>
              <button type="submit" className="btn-submit min-h-13 rounded-control px-8 text-lg font-bold">
                {c.buttonLabel}
              </button>
            </div>
          </div>
        </form>
        {photo && (
          <div className="relative mx-auto hidden w-full max-w-md lg:block">
            <div className="box relative aspect-[4/5] rotate-2 overflow-hidden bg-crust">
              <MediaImage media={photo} fill priority sizes="448px" alt="" className="object-cover" />
            </div>
            {ctx.settings.tagline && (
              <p className="sticker absolute -bottom-6 -left-8 size-32 -rotate-12 bg-ketchup p-3 text-base text-white shadow-box-sm">{ctx.settings.tagline}</p>
            )}
          </div>
        )}
      </Container>
    </section>
  );
}

const RENDERERS: Record<string, (p: Props) => ReactNode> = {
  hero: Hero,
  features: Features,
  about: About,
  marquee: Band,
  stats: Stats,
  franchiseFacts: FranchiseFacts,
  // The WeCrunch site has no support grid; reuse the feature tiles if an editor adds one.
  support: ({ c, s, ctx }) => <Features c={{ heading: c.heading, highlight: c.highlight, items: c.items.map((i: any) => ({ icon: i.icon, text: i.text ? `${i.title}. ${i.text}` : i.title })) }} s={s} ctx={ctx} />,
  gallery: Gallery,
  checklist: Checklist,
  investment: Investment,
  roiCalculator: Roi,
  menuCard: MenuCard,
  menuShowcase: MenuShowcase,
  testimonials: Testimonials,
  videos: Videos,
  faq: Faq,
  richText: RichTextSection,
  cta: Cta,
  enquiryForm: EnquirySection,
  contact: ContactSection,
  stateSelector: StateSelector,
};

// The background each section type is designed on (keep in step with the
// tone each renderer passes to <Section>). Used to blend neighbouring sections.
const DESIGNED_TONE: Record<string, Tone> = {
  hero: "yolk", stateSelector: "yolk", features: "batter", about: "crust", stats: "yolk", franchiseFacts: "batter",
  investment: "batter", checklist: "ketchup", gallery: "crust", videos: "crust", roiCalculator: "crust", menuCard: "white",
  menuShowcase: "yolk", testimonials: "batter", faq: "batter", richText: "batter", cta: "ketchup", enquiryForm: "yolk",
  contact: "crust",
};

export type Surface = { color: string; solid: boolean };
/** Solid surfaces (thin bands, the footer) keep their colour; neighbours fade into them. */
export const FOOTER_SURFACE: Surface = { color: TONE_COLOR.crust, solid: true };
export function sectionSurface(section: SnapshotSection): Surface {
  if (section.type === "marquee") return { color: TONE_COLOR[section.content.reverse ? "yolk" : "ketchup"], solid: true };
  return { color: TONE_COLOR[toneOf(section.settings, DESIGNED_TONE[section.type] ?? "batter")], solid: false };
}

export function SectionView({ section, ctx }: { section: SnapshotSection; ctx: Ctx }) {
  const R = RENDERERS[section.type];
  return R ? <R c={section.content} s={section.settings} ctx={ctx} /> : null;
}
