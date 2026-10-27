"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// GTM's "All Pages" trigger fires on full page loads only, and in-site links never
// reload the page. Each navigation pushes `page_view` so a GTM Custom Event trigger
// fires tags on every page. The landing page is skipped: gtm.js already covers it.
export function GtmPageView() {
  const pathname = usePathname();
  const last = useRef(pathname);
  const lastTitle = useRef("");

  useEffect(() => {
    if (last.current === pathname) {
      lastTitle.current = document.title;
      return;
    }
    last.current = pathname;
    // Next streams the new <title> in just after the page; wait up to a second for it.
    let tries = 0;
    const send = () => {
      const title = document.title;
      if ((!title || title === lastTitle.current) && tries++ < 20) return void setTimeout(send, 50);
      lastTitle.current = title;
      const w = window as typeof window & { dataLayer?: unknown[] };
      (w.dataLayer ??= []).push({ event: "page_view", page_path: pathname, page_location: window.location.href, page_title: title });
    };
    send();
  }, [pathname]);

  return null;
}
