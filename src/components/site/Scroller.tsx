"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, type ReactNode } from "react";

// Horizontal scroll-snap carousel. Native scrolling (touch, trackpad, keyboard)
// works without JS; the buttons are an enhancement.
export function Scroller({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.9, behavior: "smooth" });
  const btn = "grid size-11 place-items-center rounded-full border border-current/25 bg-white/90 text-ink shadow hover:bg-white";
  return (
    <div>
      <div
        ref={ref}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth pb-4 [scrollbar-width:thin]"
      >
        {children}
      </div>
      <div className="mt-4 flex justify-center gap-3">
        <button type="button" className={btn} onClick={() => move(-1)} aria-label={`Previous ${label}`}>
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <button type="button" className={btn} onClick={() => move(1)} aria-label={`Next ${label}`}>
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
