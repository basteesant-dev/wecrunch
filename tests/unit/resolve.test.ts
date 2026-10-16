import { describe, expect, it } from "vitest";
import { resolveContact, resolveSections, splitHighlight, type SnapshotSection } from "@/lib/resolve";

const s = (id: string, extra: Partial<SnapshotSection> = {}): SnapshotSection => ({
  id,
  type: "richText",
  key: null,
  isHidden: false,
  content: {},
  settings: {},
  stateIds: [],
  ...extra,
});

describe("resolveSections (state override → brand-wide)", () => {
  const page = [
    s("hero", { key: "hero" }),
    s("about"),
    s("hero-kerala", { key: "hero", stateIds: ["kerala"] }),
    s("offer-kerala", { stateIds: ["kerala"] }),
    s("hidden", { isHidden: true }),
    s("faq"),
  ];
  const ids = (list: SnapshotSection[]) => list.map((x) => x.id);

  it("shows only brand-wide, visible sections when there is no state", () => {
    expect(ids(resolveSections(page, null))).toEqual(["hero", "about", "faq"]);
  });

  it("replaces the brand-wide section in place with the state override", () => {
    expect(ids(resolveSections(page, "kerala"))).toEqual(["hero-kerala", "about", "offer-kerala", "faq"]);
  });

  it("does not leak another state's sections", () => {
    expect(ids(resolveSections(page, "goa"))).toEqual(["hero", "about", "faq"]);
  });

  it("keeps the first override when two share a key", () => {
    const list = [s("a", { key: "k" }), s("b", { key: "k", stateIds: ["x"] }), s("c", { key: "k", stateIds: ["x"] })];
    expect(ids(resolveSections(list, "x"))).toEqual(["b"]);
  });

  it("renders a state-only keyed section that has no brand-wide counterpart", () => {
    expect(ids(resolveSections([s("only", { key: "promo", stateIds: ["x"] })], "x"))).toEqual(["only"]);
  });
});

describe("resolveContact", () => {
  const site = { phone: "111", phoneSecondary: "222", whatsapp: "", email: "site@x.in" };
  it("falls back from state to page to site", () => {
    expect(resolveContact(site, { phone: "page" }, { phone: "state" }).phone).toBe("state");
    expect(resolveContact(site, { phone: "page" }, { phone: null }).phone).toBe("page");
    expect(resolveContact(site, null, null)).toEqual({ phone: "111", phoneSecondary: "222", whatsapp: "", email: "site@x.in" });
  });
  it("has no WhatsApp unless one is configured", () => {
    expect(resolveContact(site, { phone: "9" }, null).whatsapp).toBe("");
    expect(resolveContact(site, null, { whatsapp: "999" }).whatsapp).toBe("999");
  });
});

describe("splitHighlight", () => {
  it("splits case-insensitively", () => {
    expect(splitHighlight("Start your TEA franchise", "tea franchise")).toEqual([
      { text: "Start your ", hl: false },
      { text: "TEA franchise", hl: true },
    ]);
  });
  it("returns the whole heading when the highlight is absent", () => {
    expect(splitHighlight("Menu", "nope")).toEqual([{ text: "Menu", hl: false }]);
  });
});
