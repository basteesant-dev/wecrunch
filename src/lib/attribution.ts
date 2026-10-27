// Campaign attribution captured when a visitor lands, persisting UTMs, ad
// parameters, and landing page URL across navigation via first-party cookies,
// localStorage, and sessionStorage.
//
// Ad URL templates this reads:
//   Meta:   ...&utm_content={{ad.name}}
//   Google: ...&utm_adgroupname={adgroupname}&utm_term={keyword}&utm_content={creative}

export type Attribution = {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
  utmAdgroupName: string;
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
  utmAdgroupName: "",
  landingPage: "",
  referrer: "",
  trafficSource: "",
};

const UTM_PARAMS = [
  ["utm_source", "utmSource"],
  ["utm_medium", "utmMedium"],
  ["utm_campaign", "utmCampaign"],
  ["utm_term", "utmTerm"],
  ["utm_content", "utmContent"],
  ["utm_adgroupname", "utmAdgroupName"],
] as const;

// AI assistants that send visitors, matched against the referrer host or utm_source
// (ChatGPT tags its outbound links with utm_source=chatgpt.com).
const AI_ASSISTANTS: [RegExp, string][] = [
  [/chatgpt|openai/, "ChatGPT"],
  [/perplexity/, "Perplexity"],
  [/claude/, "Claude"],
  [/gemini|bard\.google/, "Gemini"],
  [/copilot/, "Copilot"],
  [/deepseek/, "DeepSeek"],
  [/grok|(^|\.)x\.ai$/, "Grok"],
  [/(^|\.)meta\.ai$/, "Meta AI"],
  [/mistral/, "Mistral"],
  [/(^|\.)you\.com$/, "You.com"],
  [/phind/, "Phind"],
  [/(^|\.)poe\.com$/, "Poe"],
];

export function aiAssistant(hostOrSource: string): string | null {
  const v = hostOrSource.toLowerCase();
  return v ? (AI_ASSISTANTS.find(([re]) => re.test(v))?.[1] ?? null) : null;
}

// AI agents that browse and submit forms on a person's behalf. ChatGPT agent uses a
// normal Chrome user agent but signs its requests with `Signature-Agent: "https://chatgpt.com"`.
const AI_AGENTS: [RegExp, string][] = [
  [/ChatGPT-User|OAI-SearchBot|GPTBot/i, "ChatGPT"],
  [/Perplexity-User|PerplexityBot/i, "Perplexity"],
  [/Claude-User|Claude-SearchBot|ClaudeBot/i, "Claude"],
  [/MistralAI-User/i, "Mistral"],
  [/DuckAssistBot/i, "DuckDuckGo"],
  [/meta-externalagent|Meta-ExternalFetcher/i, "Meta AI"],
];

export function detectAiAgent(userAgent: string | null | undefined, signatureAgent: string | null | undefined): string | null {
  if (signatureAgent && /chatgpt\.com/i.test(signatureAgent)) return "ChatGPT";
  const ua = userAgent ?? "";
  return AI_AGENTS.find(([re]) => re.test(ua))?.[1] ?? null;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function detectTrafficSource(params: URLSearchParams, referrer: string, host: string) {
  const ai = aiAssistant(params.get("utm_source") ?? "") ?? aiAssistant(hostOf(referrer));
  if (ai) return `ai:${ai}`;
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

const SOURCE_LABELS: Record<string, string> = {
  google_ads: "Google Ads",
  facebook_ads: "Meta Ads",
  organic_search: "Organic search",
  social: "Social",
  email: "Email",
  referral: "Referral",
  direct: "Direct",
  internal: "Internal",
  unknown: "Unknown",
};

/** Human label for a stored trafficSource, e.g. "ai:ChatGPT" → "AI assistant · ChatGPT". */
export function trafficLabel(source: string | null | undefined) {
  if (!source) return "";
  if (source.startsWith("ai_agent:")) return `AI agent · ${source.slice(9)}`;
  if (source.startsWith("ai:")) return `AI assistant · ${source.slice(3)}`;
  return SOURCE_LABELS[source] ?? source;
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
  for (const read of [() => sessionStorage.getItem(STORAGE_KEY), () => localStorage.getItem(STORAGE_KEY), () => getCookie(STORAGE_KEY)]) {
    try {
      const raw = read();
      // Merged over EMPTY so data saved before a field existed still has every key.
      if (raw) return { ...EMPTY_ATTRIBUTION, ...(JSON.parse(raw) as Partial<Attribution>) };
    } catch {}
  }

  // Fallback to individual cookies if the JSON bundle wasn't present
  const a: Attribution = { ...EMPTY_ATTRIBUTION, landingPage: getCookie("landing_page") || "" };
  for (const [param, key] of UTM_PARAMS) a[key] = getCookie(param) || "";
  if (!a.utmSource && !a.utmMedium && !a.utmCampaign && !a.landingPage) return null;
  a.trafficSource = a.utmSource || "unknown";
  return a;
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
  for (const [param, key] of UTM_PARAMS) if (a[key]) setCookie(param, a[key]);
  if (a.landingPage) setCookie("landing_page", a.landingPage);
}

/**
 * Capture UTMs, landing page URL and traffic source.
 * A new campaign click (UTM / gclid / fbclid) or an AI-assistant referral replaces
 * what was stored; any other page view keeps the earlier attribution.
 */
export function captureAttribution(): Attribution {
  if (typeof window === "undefined") return EMPTY_ATTRIBUTION;

  const q = new URLSearchParams(window.location.search);
  const referrer = document.referrer;
  const incoming =
    UTM_PARAMS.some(([param]) => q.get(param)) || Boolean(q.get("gclid") || q.get("fbclid")) || aiAssistant(hostOf(referrer)) !== null;

  if (!incoming) {
    const existing = loadPersisted();
    if (existing && (existing.utmSource || existing.landingPage)) return existing;
  }

  const gclid = q.get("gclid");
  const fbclid = q.get("fbclid");
  const a: Attribution = {
    ...EMPTY_ATTRIBUTION,
    landingPage: window.location.href.slice(0, 2000),
    referrer: referrer.slice(0, 500),
    trafficSource: detectTrafficSource(q, referrer, window.location.host),
  };
  for (const [param, key] of UTM_PARAMS) a[key] = q.get(param) ?? "";
  a.utmSource ||= gclid ? "google" : fbclid ? "facebook" : "";
  a.utmMedium ||= gclid ? "cpc" : fbclid ? "paid_social" : "";
  persist(a);
  return a;
}
