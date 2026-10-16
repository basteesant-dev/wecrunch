import { getPublicState, getPublishedPage, getSettings, type PublicState } from "@/lib/content";
import type { PageSnapshot } from "@/lib/resolve";
import { stateStatusSnapshot } from "@/components/site/SitePage";

export type Resolved =
  | { kind: "render"; snapshot: PageSnapshot; state: PublicState | null }
  | { kind: "notFound" };

/**
 * URL → content. A state slug wins over a page slug (so /tamilnadu renders the
 * Tamil Nadu landing page with Tamil Nadu context); then pages. CMS redirects
 * are handled earlier, in src/proxy.ts.
 */
export async function resolvePath(segments: string[]): Promise<Resolved> {
  const path = segments.map((s) => decodeURIComponent(s).toLowerCase()).join("/");
  if (segments.length === 1 && path !== "home") {
    const state = await getPublicState(path);
    if (state) {
      if (state.status === "ACTIVE" && state.landingSlug) {
        const landing = await getPublishedPage(state.landingSlug);
        if (landing) return { kind: "render", snapshot: landing.snapshot, state };
      }
      return { kind: "render", snapshot: stateStatusSnapshot(state, await getSettings()), state };
    }
    const page = await getPublishedPage(path);
    if (page) return { kind: "render", snapshot: page.snapshot, state: null };
  }
  return { kind: "notFound" };
}
