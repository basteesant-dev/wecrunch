// Campaign attribution captured on the visitor's first page view of the session,
// mirroring the live site's tracking script (UTM → ads click IDs → referrer).

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

const KEY = "enquiry_attribution";

export function captureAttribution(): Attribution {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved) return JSON.parse(saved) as Attribution;
  } catch {}
  const q = new URLSearchParams(location.search);
  const a: Attribution = {
    utmSource: q.get("utm_source") ?? "",
    utmMedium: q.get("utm_medium") ?? "",
    utmCampaign: q.get("utm_campaign") ?? "",
    utmTerm: q.get("utm_term") ?? "",
    utmContent: q.get("utm_content") ?? "",
    landingPage: (location.pathname + location.search).slice(0, 500),
    referrer: document.referrer.slice(0, 500),
    trafficSource: detectTrafficSource(q, document.referrer, location.host),
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
  return a;
}
