"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Cookieless first-party pageview tracker. On every client-side navigation it
 * fires a small beacon to /api/analytics/collect, which does the real work
 * (geo/UA parsing, visitor hashing, storage) server-side. No cookies, no
 * third-party scripts. Admin routes are excluded so staff don't skew the data.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastSent = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith("/admin")) return;
    if (lastSent.current === pathname) return; // dedupe re-renders / strict-mode
    lastSent.current = pathname;

    const body = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      screen: window.innerWidth || null,
    });

    try {
      if (typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(
          "/api/analytics/collect",
          new Blob([body], { type: "application/json" }),
        );
      } else {
        void fetch("/api/analytics/collect", {
          method: "POST",
          body,
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch {
      // Tracking must never break the page.
    }
  }, [pathname]);

  return null;
}
