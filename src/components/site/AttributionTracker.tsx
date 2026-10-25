"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/**
 * Ensures UTM parameters, click IDs (gclid, fbclid), and landing page URLs
 * are captured on initial entry and preserved across subsequent page navigation.
 */
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
