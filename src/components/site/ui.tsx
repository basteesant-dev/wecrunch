import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import type { Media } from "@/lib/content";
import { splitHighlight } from "@/lib/resolve";

export function Highlighted({ text, highlight }: { text: string; highlight?: string }) {
  return (
    <>
      {splitHighlight(text, highlight).map((p, i) => (p.hl ? <span key={i} className="hl">{p.text}</span> : p.text))}
    </>
  );
}

export function SectionHeading({
  heading,
  highlight,
  eyebrow,
  as: Tag = "h2",
  align = "left",
}: {
  heading?: string;
  highlight?: string;
  eyebrow?: string;
  as?: "h1" | "h2";
  align?: "left" | "center";
}) {
  if (!heading && !eyebrow) return null;
  return (
    <div className={`mb-10 max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className="mb-3 text-lg font-bold">{eyebrow}</p>}
      {heading && (
        <Tag className="text-title">
          <Highlighted text={heading} highlight={highlight} />
        </Tag>
      )}
    </div>
  );
}

const TONES = {
  batter: "bg-batter text-crust",
  white: "bg-white text-crust",
  yolk: "bg-yolk text-crust",
  crust: "on-crust bg-crust text-batter",
  ketchup: "bg-ketchup text-white",
} as const;
export type Tone = keyof typeof TONES;

export const TONE_COLOR: Record<Tone, string> = {
  batter: "var(--color-batter)",
  white: "var(--color-white)",
  yolk: "var(--color-yolk)",
  crust: "var(--color-crust)",
  ketchup: "var(--color-ketchup)",
};

// CMS "background" setting → tone. "default" keeps the section's designed tone.
const FROM_SETTING: Record<string, Tone> = { light: "white", muted: "batter", dark: "crust", brand: "yolk" };
const SPACING: Record<string, string> = { none: "", sm: "py-12 md:py-16", md: "py-16 md:py-24", lg: "py-24 md:py-32" };

export function toneOf(settings: Record<string, unknown>, designed: Tone): Tone {
  return FROM_SETTING[settings.background as string] ?? designed;
}

export function Section({ settings, tone, className = "", children }: { settings: Record<string, unknown>; tone: Tone; className?: string; children: ReactNode }) {
  const spacing = (settings.spacing as string) || "md";
  const t = toneOf(settings, tone);
  return (
    <section
      id={(settings.anchorId as string) || undefined}
      className={`blend ${TONES[t]} ${SPACING[spacing] ?? SPACING.md} ${className}`}
      style={{ "--own": TONE_COLOR[t] } as CSSProperties}
    >
      {children}
    </section>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-content px-5 sm:px-8 ${className}`}>{children}</div>;
}

export function MediaImage({
  media,
  className,
  sizes = "100vw",
  priority,
  fill,
  alt,
}: {
  media: Media | undefined;
  className?: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  alt?: string;
}) {
  if (!media) return null;
  if (fill) return <Image src={media.url} alt={alt ?? media.alt} fill sizes={sizes} priority={priority} className={className} />;
  return <Image src={media.url} alt={alt ?? media.alt} width={media.width ?? 1200} height={media.height ?? 800} sizes={sizes} priority={priority} className={className} />;
}

export function RichText({ html, className = "" }: { html: string; className?: string }) {
  // Sanitised on save (lib/sanitize.ts) and again when the snapshot is published.
  return <div className={`prose-cms ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
