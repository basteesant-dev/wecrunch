// Pure content-resolution rules (no I/O) so they can be unit tested.

export type SnapshotSection = {
  id: string;
  type: string;
  key: string | null;
  isHidden: boolean;
  content: Record<string, unknown>;
  settings: Record<string, unknown>;
  stateIds: string[]; // empty = every visitor
};

export type PageSnapshot = {
  page: {
    title: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    ogImageId: string | null;
    canonicalUrl: string | null;
    noIndex: boolean;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
  };
  sections: SnapshotSection[];
};

/**
 * Sections a visitor sees, in order.
 *
 * Rule: state override → brand-wide content.
 * - Hidden sections never render.
 * - A section scoped to states renders only for those states.
 * - A state-scoped section with an override `key` replaces the brand-wide
 *   section with the same key, taking over its position.
 * - Without a state (e.g. /north directly), only brand-wide sections render.
 */
export function resolveSections(sections: SnapshotSection[], stateId?: string | null): SnapshotSection[] {
  const visible = sections.filter(
    (s) => !s.isHidden && (s.stateIds.length === 0 || (!!stateId && s.stateIds.includes(stateId))),
  );
  const overrides = new Map<string, SnapshotSection>();
  for (const s of visible) if (s.stateIds.length > 0 && s.key && !overrides.has(s.key)) overrides.set(s.key, s);

  const globalKeys = new Set(visible.filter((s) => s.stateIds.length === 0 && s.key).map((s) => s.key));
  const out: SnapshotSection[] = [];
  for (const s of visible) {
    const isGlobal = s.stateIds.length === 0;
    if (isGlobal && s.key && overrides.has(s.key)) {
      out.push(overrides.get(s.key)!);
    } else if (!isGlobal && s.key && globalKeys.has(s.key)) {
      continue; // already emitted in place of its brand-wide counterpart
    } else if (!isGlobal && s.key && overrides.get(s.key) !== s) {
      continue; // a second override for the same key; first one wins
    } else {
      out.push(s);
    }
  }
  return out;
}

export type Contact = { phone: string; phoneSecondary: string; whatsapp: string; email: string };

type ContactSource = { phone?: string | null; whatsapp?: string | null; email?: string | null } | null | undefined;

/** Contact details: state override → landing page override → site settings. */
export function resolveContact(
  site: { phone: string; phoneSecondary?: string; whatsapp?: string; email: string },
  page: ContactSource,
  state: ContactSource,
): Contact {
  const pick = (k: "phone" | "whatsapp" | "email", fallback: string) => state?.[k] || page?.[k] || fallback;
  return {
    phone: pick("phone", site.phone),
    phoneSecondary: site.phoneSecondary ?? "",
    whatsapp: pick("whatsapp", site.whatsapp ?? ""), // empty = no WhatsApp button
    email: pick("email", site.email),
  };
}

/** Splits a heading so the highlighted words can be styled. */
export function splitHighlight(heading: string, highlight?: string | null) {
  if (!highlight) return [{ text: heading, hl: false }];
  const i = heading.toLowerCase().indexOf(highlight.toLowerCase());
  if (i < 0) return [{ text: heading, hl: false }];
  return [
    { text: heading.slice(0, i), hl: false },
    { text: heading.slice(i, i + highlight.length), hl: true },
    { text: heading.slice(i + highlight.length), hl: false },
  ].filter((p) => p.text);
}
