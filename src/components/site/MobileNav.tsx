"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";

// Mobile menu panel. Closes on link click, Escape, or tapping outside.
export function MobileNav({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen(!open)}
        className="grid size-11 place-items-center rounded-lg text-white hover:bg-white/10"
      >
        {open ? <X className="size-6" aria-hidden="true" /> : <Menu className="size-6" aria-hidden="true" />}
      </button>
      {open && <div className="fixed inset-0 z-40" aria-hidden="true" onClick={() => setOpen(false)} />}
      <div
        id={id}
        hidden={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className="absolute inset-x-4 top-full z-50 mt-2 rounded-2xl border-3 border-yolk bg-crust p-4 text-batter shadow-box-yolk"
      >
        {children}
      </div>
    </div>
  );
}
