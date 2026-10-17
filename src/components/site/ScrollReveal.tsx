"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Section content slides in as it scrolls into view and slides back out the way
// it came when scrolled away (so scrolling back up plays it in reverse). Items in
// a grid or list come from alternating sides. Applied automatically to every
// section's content; the hero, tickers and drifting card rows are left alone.
// Without JS, or with reduced motion, nothing is hidden.
const GROUP = /\b(grid|columns-\d|space-y-\d)\b/;

function collect(el: Element, depth: number, out: { el: HTMLElement; x: number; i: number }[]) {
  const kids = [...el.children].filter((k): k is HTMLElement => k instanceof HTMLElement);
  kids.forEach((k, i) => {
    const isGroup = depth < 2 && !k.classList.contains("outline-card") && (GROUP.test(k.className) || /^(UL|OL|DL)$/.test(k.tagName));
    if (isGroup && k.children.length > 1) return collect(k, depth + 1, out);
    const sided = kids.length > 1 && (GROUP.test(el.getAttribute("class") ?? "") || /^(UL|OL|DL)$/.test(el.tagName));
    out.push({ el: k, x: sided ? (i % 2 ? 1 : -1) : 0, i });
  });
}

export function ScrollReveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const items: { el: HTMLElement; x: number; i: number }[] = [];
    document.querySelectorAll("#main section.blend").forEach((sec) => {
      sec.querySelectorAll(":scope > div").forEach((container) => collect(container, 0, items));
    });

    const place = (el: HTMLElement, rect: DOMRectReadOnly) => {
      el.dataset.reveal = rect.top < 0 ? "above" : "below";
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) el.dataset.reveal = "in";
          else place(el, e.boundingClientRect);
        }
      },
      { rootMargin: "-6% 0px -6% 0px" },
    );

    for (const { el, x, i } of items) {
      el.style.setProperty("--rx", String(x));
      el.style.setProperty("--rd", `${Math.min(i, 5) * 70}ms`);
      const r = el.getBoundingClientRect();
      // Already on screen at load: show without animating.
      if (r.top < innerHeight && r.bottom > 0) el.dataset.reveal = "in";
      else place(el, r);
      io.observe(el);
    }
    requestAnimationFrame(() => document.documentElement.setAttribute("data-reveal-ready", ""));
    return () => {
      io.disconnect();
      document.documentElement.removeAttribute("data-reveal-ready");
      for (const { el } of items) delete el.dataset.reveal;
    };
  }, [pathname]);
  return null;
}
