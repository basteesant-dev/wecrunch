// Campaign attribution captured on the visitor's first page view of the session,
// persisting UTMs, ad parameters, and landing page URL across navigation via
// first-party cookies, localStorage, and sessionStorage.

export type Attribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  landingPage: string;
  referrer: string;
  trafficSource: string;
};

export const EMPTY_ATTRIBUTION: Attribution = {
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmTerm: "",
  utmContent: "",
  landingPage: "",
  referrer: "",
  trafficSource: "",
};

export function detectTrafficSource(params: URLSearchParams, referrer: string, host: string) {
  if (params.get("utm_source")) return params.get("utm_source")!;
  if (params.get("gclid")) return "google_ads";
  if (params.get("fbclid")) return "facebook_ads";
  if (!referrer) return "direct";
  const ref = referrer.toLowerCase();
  if (/(^|\.|\/)(google|bing|yahoo|duckduckgo)\./.test(ref)) return "organic_search";
  if (/(facebook|instagram|linkedin|youtube)\.|\/\/t\.co\//.test(ref)) return "social";
  if (/(^|\/\/|\.)(mail|outlook)\./.test(ref)) return "email";
  try {
    if (new URL(referrer).host !== host) return "referral";
  } catch {
    return "unknown";
  }
  return "internal";
}

const STORAGE_KEY = "enquiry_attribution";
const COOKIE_DAYS = 30;

function setCookie(name: string, value: string, days = COOKIE_DAYS) {
  if (typeof document === "undefined") return;
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {}
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function loadPersisted(): Attribution | null {
  if (typeof window === "undefined") return null;
  try {
    const sessionData = sessionStorage.getItem(STORAGE_KEY);
    if (sessionData) return JSON.parse(sessionData) as Attribution;
  } catch {}
  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData) return JSON.parse(localData) as Attribution;
  } catch {}
  try {
    const cookieData = getCookie(STORAGE_KEY);
    if (cookieData) return JSON.parse(cookieData) as Attribution;
  } catch {}

  // Fallback to individual cookies if JSON bundle wasn't present
  const utmSource = getCookie("utm_source");
  const utmMedium = getCookie("utm_medium");
  const utmCampaign = getCookie("utm_campaign");
  const utmTerm = getCookie("utm_term");
  const utmContent = getCookie("utm_content");
  const landingPage = getCookie("landing_page");

  if (utmSource || utmMedium || utmCampaign || landingPage) {
    return {
      utmSource: utmSource || "",
      utmMedium: utmMedium || "",
      utmCampaign: utmCampaign || "",
      utmTerm: utmTerm || "",
      utmContent: utmContent || "",
      landingPage: landingPage || "",
      referrer: "",
      trafficSource: utmSource || "unknown",
    };
  }

  return null;
}

function persist(a: Attribution) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(a);
  try {
    sessionStorage.setItem(STORAGE_KEY, json);
  } catch {}
  try {
    localStorage.setItem(STORAGE_KEY, json);
  } catch {}
  setCookie(STORAGE_KEY, json);

  // Also set individual first-party cookies for direct UTM inspection
  if (a.utmSource) setCookie("utm_source", a.utmSource);
  if (a.utmMedium) setCookie("utm_medium", a.utmMedium);
  if (a.utmCampaign) setCookie("utm_campaign", a.utmCampaign);
  if (a.utmTerm) setCookie("utm_term", a.utmTerm);
  if (a.utmContent) setCookie("utm_content", a.utmContent);
  if (a.landingPage) setCookie("landing_page", a.landingPage);
}

/**
 * Capture UTMs, landing page URL and traffic source.
 * If incoming URL has campaign/UTM parameters, they are captured and persisted.
 * If not, previously persisted attribution is preserved across page navigation.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;

  const q = new URLSearchParams(window.location.search);
  const hasIncomingUtm = Boolean(
    q.get("utm_source") ||
      q.get("utm_medium") ||
      q.get("utm_campaign") ||
      q.get("utm_term") ||
      q.get("utm_content") ||
      q.get("gclid") ||
      q.get("fbclid"),
  );

  if (hasIncomingUtm) {
    const rawSource = q.get("utm_source");
    const rawMedium = q.get("utm_medium");
    const gclid = q.get("gclid");
    const fbclid = q.get("fbclid");

    const utmSource = rawSource ?? (gclid ? "google" : fbclid ? "facebook" : "");
    const utmMedium = rawMedium ?? (gclid ? "cpc" : fbclid ? "paid_social" : "");

    const fullLanding = (typeof window !== "undefined" && window.location.href)
      ? window.location.href.slice(0, 2000)
      : (window.location.pathname + window.location.search).slice(0, 2000);

    const a: Attribution = {
      utmSource,
      utmMedium,
      utmCampaign: q.get("utm_campaign") ?? "",
      utmTerm: q.get("utm_term") ?? "",
      utmContent: q.get("utm_content") ?? "",
      landingPage: fullLanding,
      referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
      trafficSource: detectTrafficSource(q, typeof document !== "undefined" ? document.referrer : "", window.location.host),
    };
    persist(a);
    return a;
  }

  // Preserve existing campaign attribution across navigation
  const existing = loadPersisted();
  if (existing && (existing.utmSource || existing.landingPage)) {
    return existing;
  }

  // First touch without UTMs: save direct/organic landing
  const fullLanding = (typeof window !== "undefined" && window.location.href)
    ? window.location.href.slice(0, 2000)
    : (window.location.pathname + window.location.search).slice(0, 2000);

  const fallback: Attribution = {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmTerm: "",
    utmContent: "",
    landingPage: fullLanding,
    referrer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : "",
    trafficSource: detectTrafficSource(q, typeof document !== "undefined" ? document.referrer : "", window.location.host),
  };
  persist(fallback);
  return fallback;
}
