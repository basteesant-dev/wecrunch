// WeCrunch reference content, transcribed from https://wecrunchfranchise.com/
// (audited 2026-10-11; see docs/wecrunch-reference-audit.md). Copy that was added
// or corrected rather than transcribed is marked "REVIEW" for the content team.
import type { StateStatus } from "../src/generated/prisma/enums";

type Section = {
  type: string;
  key?: string;
  content: Record<string, unknown>;
  settings?: Record<string, unknown>;
  contentFile?: string;
};

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const slugify = (s: string) => s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const WHY_CHOOSE = (tn: boolean) => [
  { icon: "Wallet", text: "Low Investment & High Profit" },
  { icon: "CalendarDays", text: "Operational breakeven from month one" },
  { icon: "Users", text: "No experience staff required" },
  { icon: "UserCog", text: "Staff training at your own location" },
  { icon: "Undo2", text: "Returns from as early as from first month" },
  { icon: "Wrench", text: "Entire setup will be handled by the brand" },
  ...(tn ? [{ icon: "IndianRupee", text: "No Royalty" }] : []),
  { icon: "Sparkles", text: "Hassle free business to operate." },
];

const PARTNERS = [
  "Ability to invest",
  "Passionate and highly motivated to succeed in business", // REVIEW: live site reads "suceed"
  "Leaders with vision",
  "Passion to build a brand",
  "Passion to serve quality products to consumers",
].map((text) => ({ text }));

// REVIEW: live site reads "at most freshness"; corrected to "utmost freshness".
const STORY =
  "<p>Dav &amp; Mel Hospitality, the parent company has We Crunch, it brings the finest flavors of crunchy chicken with utmost freshness to it. Crunchy chicken, burgers, wraps, Brownies, overloaded fries and much more, we have them all covered in our menu.</p>";

// Product photos have no captions on the live site; names come from the menu card. REVIEW
const PRODUCTS: [string, string][] = [
  ["product-1", "Hot and Crunchy Chicken"],
  ["product-2", "Chicken Crunchy Burger"],
  ["product-3", "Chicken Wrap"],
  ["product-4", "French Fries"],
  ["product-5", "Snack Platter"],
  ["product-6", "Smileys"],
  ["product-7", "Sizzling Brownie with Icecream"],
  ["product-8", "Mojito"],
  ["product-9", "Milkshake Oreo"],
];

// "{state}" becomes the state's name on every state URL that renders the page.
const STATE_SEO_TITLE = "WeCrunch Fried Chicken Franchise in {state}";
const STATE_SEO_DESCRIPTION =
  "Start a WeCrunch fried chicken franchise in {state}. No frozen, only fresh chicken, investment under ₹4 Lakhs + GST and the entire setup handled by the brand.";

// Three outlet formats from the "WE CRUNCH BROCHURE SEPT" sales & revenue forecast.
// The brochure lists no royalty; North keeps its 5000/- a month (7th month onwards).
const roi = (tn: boolean) => {
  const royalty = tn ? 0 : 5000;
  return {
  eyebrow: "Sales & revenue forecast",
  heading: "Calculate your profit from your daily sales",
  highlight: "your profit",
  intro: "Three outlet formats from our franchise brochure. Pick one to load its numbers into the calculator, then run your own.",
  investment: tn ? 380000 : 379000,
  daysPerMonth: 30,
  defaultScenario: 2,
  scenarios: [
    { label: "Projection 1", subtitle: "Take Away (100-150 sqft)", dailySales: 6000, salary: 24000, rent: 12000, electricity: 9000, royalty },
    { label: "Projection 2", subtitle: "QSR (200-300 sqft)", dailySales: 10000, salary: 24000, rent: 30000, electricity: 15000, royalty },
    { label: "Projection 3", subtitle: "Casual Dine In (300-500 sqft)", dailySales: 15000, salary: 36000, rent: 40000, electricity: 22000, royalty },
  ],
  variableCosts: [{ label: "Food cost", percent: 40, note: "" }],
  disclaimer: `Figures are illustrative and may vary by location, footfall and operating costs. Investment shown excludes GST and interior.${tn ? "" : " Royalty applies from the 7th month."}`,
  };
};

function landingSections(market: "tamilnadu" | "north"): Section[] {
  const tn = market === "tamilnadu";
  return [
    {
      type: "hero",
      key: "hero",
      content: {
        tagline: "No Frozen Only Fresh Chicken",
        eyebrow: "Profit Margin, More Than 40%",
        backdropText: "Born in South. Loved from Kashmir to Kanyakumari",
        heading: "Start your own high profitable fried chicken franchise",
        priceTag: `₹${tn ? "3.80" : "3.79"} Lakhs + GST`,
        background: "@media:hero-bg",
        showPhoneCta: true,
        formId: "@form:franchise-enquiry",
        formTitle: "Franchise Enquiry",
      },
      settings: { variant: "form-right", spacing: "none" },
    },
    { type: "features", content: { heading: "Why choose We Crunch franchise?", items: WHY_CHOOSE(tn) } },
    { type: "about", content: { heading: "Our delicious story", body: STORY, image: `@media:about-${tn ? "tn" : "north"}`, imagePosition: "left" }, settings: { anchorId: "about" } },
    { type: "marquee", content: { items: ["Low Investment", "High Profit", "100% Ownership", "480+ Outlets"].map((text) => ({ text })) }, settings: { spacing: "none" } },
    {
      type: "stats",
      content: {
        heading: "Our growth story",
        items: [
          { value: 1, suffix: "+", label: "Countries" },
          { value: 480, suffix: "+", label: "Outlets" },
          { value: 6, suffix: "+", label: "States" },
          { value: 50, suffix: "L+", label: "Happy Customers" },
        ],
      },
    },
    { type: "franchiseFacts", key: "facts", content: { heading: "Franchise facts", modelId: `@model:${market}`, showRoyalty: true } },
    { type: "gallery", content: { heading: "Gallery", galleryId: "@gallery:outlets" }, settings: { anchorId: "gallery", variant: "portrait" } },
    { type: "marquee", content: { items: ["Fried Chicken", "Burgers", "French Fries", "Wraps", "Overloaded Fries"].map((text) => ({ text })), reverse: true }, settings: { spacing: "none" } },
    { type: "checklist", content: { eyebrow: "What we are looking for", heading: "From franchise partners", items: PARTNERS } },
    { type: "investment", key: "investment", content: { heading: "Investment breakup", modelId: `@model:${market}` } },
    { type: "roiCalculator", key: "roi", content: roi(tn), settings: { anchorId: "roi-calculator" } },
    { type: "menuCard", key: "menu-card", content: { heading: "Menu card", image: `@media:menu-card-${tn ? "south" : "north"}`, menuId: "@menu:wecrunch", ...MENU_PANEL } },
    { type: "testimonials", content: { eyebrow: "Real stories. Real success.", heading: "The We Crunch way", source: "all" }, settings: { anchorId: "testimonials" } },
    {
      type: "videos",
      content: {
        items: [
          { video: "@media:video-1", poster: "@media:video-1-poster", title: "WeCrunch franchise video 1" },
          { video: "@media:video-2", poster: "@media:video-2-poster", title: "WeCrunch franchise video 2" },
        ],
      },
    },
    { type: "menuShowcase", content: { heading: "Our menu", items: PRODUCTS.map(([media, label]) => ({ image: `@media:${media}`, label })) }, settings: { anchorId: "menu" } },
  ];
}

type MenuSeed = { name: string; slug: string; description?: string; categories: { name: string; items: [string, number, string?][] }[] };

// Transcribed from "WE CRUNCH NEW MENU SEPT" (one card for all states), in the
// card's reading order: down each column, left to right.
const MENU: MenuSeed = {
  name: "WeCrunch menu",
  slug: "wecrunch",
  description: "Transcribed from the WeCrunch menu card, September 2026 (prices in ₹).",
  categories: [
    { name: "Burgers", items: [["Kiddy Veg Burger", 29], ["Chicken Kiddy Crunchy Burger", 69], ["Veg Burger", 79], ["Chicken Patty Burger", 99], ["Chicken Crunchy Burger", 129], ["Paneer Cheese Burger", 129], ["No Bun Burger", 189], ["Chicken Tower Burger", 199]] },
    { name: "Crunchy Chicken", items: [["Pcs of Choice", 79], ["Hot and Crunchy Chicken 2pc", 159], ["Hot and Crunchy Chicken 4pc", 339], ["Hot and Crunchy Chicken 8pc", 549]] },
    {
      name: "Overloaded Fries",
      items: [
        ["Overloaded Cheesy Fries", 129], ["Overloaded Cheesy Nachos", 129], ["Overloaded Cheesy Veg Fries", 149], ["Overloaded Cheesy Veg Nachos", 149],
        ["Overloaded Cheesy Paneer Fries", 169], ["Overloaded Cheesy Paneer Nachos", 169], ["Overloaded Cheesy Popcorn Chicken Fries", 189], ["Overloaded Cheesy Popcorn Chicken Nachos", 189],
      ],
    },
    { name: "Snack N-Veg", items: [["Chicken Nuggets 5pcs", 99], ["Chicken Popcorn 100grm", 99], ["Chicken Strips 3 pcs", 99], ["Chicken Lollipop", 119], ["Hot Wings 4 pcs", 119], ["BBQ Wings 4 pcs", 129]] },
    { name: "Snack Veg", items: [["Veg Nuggets 5 pcs", 59], ["French Fries", 69], ["Smiley 5 pcs", 69], ["Potato Wedges 100gms", 79], ["Cheese Corn Nuggets", 99]] },
    { name: "Mojitos", items: [["Blue Mojito", 75], ["Strawberry Mojito", 75], ["Mango Mojito", 75], ["Blueberry Mojito", 75], ["Mint Mojito", 75], ["Pineapple Mojito", 75]] },
    { name: "Family Feast 1", items: [["4 Chicken Crunchy Burger + 4pcs Crunchy Chicken + 2 Fries + 4 Soft Drinks", 899]] },
    { name: "Family Feast 2", items: [["8 pcs Crunchy Chicken Tub + 8pcs Lollipop + 2 Fries + 4 Soft Drinks", 999]] },
    { name: "Wraps", items: [["Veg Wrap", 89], ["Chicken Wrap", 99], ["Periperi Chicken Wrap", 99], ["BBQ Chicken Wrap", 99], ["Paneer Cheese Wrap", 159]] },
    { name: "Non Veg Burger Combo", items: [["Chicken Patty Burger + Fries + Soft Drink", 159], ["Chicken Crunchy Burger + Fries + Soft Drink", 199], ["Chicken Tower Burger + Fries + Soft Drink", 249]] },
    {
      name: "Combos",
      items: [
        ["Snack Platter Non Veg", 349, "4pcs Lollipop + 4 pcs Hot Wings + 4pcs Chicken Nuggets + 2 Soft Drinks"],
        ["Snack Platter Veg", 249, "Smileys + Potato Wedges + Cheese Corn Nuggets + 2 Soft Drinks"],
        ["Just for 2 Non Veg", 499, "2 Chicken Crunchy Burger + 2pcs Crunchy Chicken + Fries + 2 Soft Drinks"],
        ["Just for 2 Veg", 279, "2 Veg Burger + Smileys + Veg Nuggets + 2 Soft Drinks"],
      ],
    },
    { name: "Veg Burger Combo", items: [["Classic Veg Burger + Fries + Soft Drink", 139], ["Paneer Cheese Burger + Fries + Soft Drink", 159]] },
    { name: "Shakes", items: [["Milkshake Vanilla", 99], ["Milkshake Strawberry", 99], ["Milkshake Chocolate", 99], ["Milkshake Oreo", 99], ["Milkshake Pista", 99]] },
    {
      name: "Nashville Sauce Varieties",
      items: [
        ["Nashville Sauce with Fried Chicken 1 Pc", 99], ["Nashville Sauce with Fried Chicken 2 Pc", 189], ["Nashville Sauce with Fried Chicken 4 Pc", 389],
        ["Nashville Sauce with Fried Chicken 8 Pc", 629], ["Nashville Sauce with Chicken Popcorn 100gm", 119], ["Nashville Sauce with Chicken Wings 4 Pcs", 139],
        ["Nashville Sauce with Chicken Lollipop 4 pcs", 139], ["Nashville Sauce with Fried Chicken Burger", 149],
      ],
    },
    { name: "Desserts", items: [["Cup Cake", 99], ["Cup Cake with Icecream", 119], ["Sizzling Brownie with Icecream", 119]] },
    { name: "Soft Drinks", items: [["Soft Drink", 25]] },
  ],
};

const MENU_PANEL = { panelTitle: "480+ Outlets", panelSubtitle: "All over India", panelNote: "For franchise:" };

const t = (name: string, location: string | null, quote: string) => ({ name, location, quote, rating: 5, tag: null });

export const seed = {
  media: {
    logo: { file: "logo.webp", alt: "WeCrunch — Your Crunchy Chicken Destination", folder: "brand" },
    "home-bg": { file: "home-bg.jpg", alt: "WeCrunch snack platter with fries and drinks", folder: "backgrounds" },
    "hero-bg": { file: "hero-bg.jpg", alt: "Crunchy fried chicken with dips", folder: "backgrounds" },
    "about-tn": { file: "about-tn.jpg", alt: "Crunchy fried chicken with ketchup and mayonnaise", folder: "about" },
    "about-north": { file: "about-north.jpg", alt: "Fried chicken pieces on lettuce with dips", folder: "about" },
    "outlet-1": { file: "outlet-1.avif", alt: "WeCrunch outlet with yellow signage", folder: "gallery" },
    "outlet-2": { file: "outlet-2.webp", alt: "WeCrunch outlet entrance at night", folder: "gallery" },
    "menu-card-south": { file: "menu-card-south.jpg", alt: "WeCrunch menu card with prices (Tamil Nadu)", folder: "menu" },
    "menu-card-north": { file: "menu-card-north.jpg", alt: "WeCrunch menu card with prices (North)", folder: "menu" },
    ...Object.fromEntries(PRODUCTS.map(([key, label]) => [key, { file: `${key}.jpg`, alt: label, folder: "menu" }])),
    "video-1": { file: "video-1.mp4", alt: "WeCrunch franchise video", folder: "videos" },
    "video-1-poster": { file: "video-1-poster.png", alt: "", folder: "videos" },
    "video-2": { file: "video-2.mp4", alt: "WeCrunch franchise video", folder: "videos" },
    "video-2-poster": { file: "video-2-poster.png", alt: "", folder: "videos" },
  } as Record<string, { file: string; alt: string; folder: string }>,

  settings: {
    siteName: "WeCrunch",
    tagline: "Your Crunchy Chicken Destination",
    logo: "@media:logo",
    logoAlt: "WeCrunch — Your Crunchy Chicken Destination",
    companyName: "DAV & MEL HOSPITALITY PRIVATE LIMITED",
    copyright: "© 2025 WeCrunch — A brand of DAV & MEL HOSPITALITY PRIVATE LIMITED",
    phone: "7418306999",
    phoneSecondary: "9344947978",
    email: "wecrunchsales@davandmel.com",
    address: "First Floor, 36/37, Redhills High Road,\nSamdaria Colony, Kolathur, Chennai,\nTamil Nadu 600099",
    mapQuery: "First Floor, 36/37, Redhills High Road, Samdaria Colony, Kolathur, Chennai, Tamil Nadu 600099",
    titleTemplate: "%s - WeCrunch",
    defaultSeoTitle: "WeCrunch Fried Chicken Franchise",
    defaultSeoDescription: "Start a WeCrunch fried chicken franchise. No frozen, only fresh chicken, investment under ₹4 Lakhs + GST, and the entire setup handled by the brand.",
    ogImage: "@media:hero-bg",
    defaultFormId: "@form:franchise-enquiry",
    notifyEmails: "",
    retentionDays: 0,
    chooseStateText: "Change state",
    gtmId: "GTM-P8NJST4D",
  },

  states: INDIAN_STATES.map((name) => ({
    name,
    slug: name === "Tamil Nadu" ? "tamilnadu" : slugify(name),
    status: "ACTIVE" as StateStatus,
    landing: name === "Tamil Nadu" ? "tamilnadu" : "north",
  })),

  forms: [
    {
      name: "Franchise enquiry",
      slug: "franchise-enquiry",
      title: "Franchise Enquiry",
      submitLabel: "Submit Enquiry",
      successMessage: "Thank you for your interest in WeCrunch! Our franchise team will contact you shortly.", // REVIEW: new copy
      showState: true,
      showMessage: true,
      requireConsent: true,
      // REVIEW: new; wording follows the consent clause in the Privacy Policy.
      consentText: "I agree to be contacted by WeCrunch about franchise opportunities by call, SMS, WhatsApp or email, as described in the Privacy Policy.",
      notifyEmails: ["wecrunchsales@davandmel.com"],
      // REVIEW: same lead-qualifying questions as WeChai; amount follows the ₹3.80 Lakhs investment.
      fields: [
        { name: "investment_ready", label: "Do you have ₹3.8–5 Lakhs ready for investment?", type: "radio", options: "Yes, ready\nCan arrange in 1–3 months\nNot ready now", required: true },
        { name: "location_status", label: "What is your location status?", type: "radio", options: "Location ready\nSearching / almost finalized\nNeed help / not decided", required: true },
        { name: "start_timeline", label: "When are you planning to start?", type: "radio", options: "Within 1 month\nWithin 1–3 months\nLater / not decided", required: true },
      ] as Record<string, unknown>[],
    },
  ],

  models: [
    {
      name: "Tamil Nadu fried chicken franchise",
      slug: "tamilnadu",
      totalInvestment: "3.80 Lakhs (Excluding Interior)",
      area: "Approximately 100 to 150 sq.ft required",
      expansion: "Pan India",
      roi: "From 1st month Onwards",
      payback: "6 to 8 Months",
      royalty: "Zero Royalty",
      breakdown: [
        { label: "Total Investment", value: "Rs 3,80,000/-", note: "(Franchise fee + kitchen equipment, excluding interior)", icon: "Wallet" },
        { label: "Franchise Fee", value: "Rs 2,00,000/-", icon: "IndianRupee" },
        { label: "Kitchen Equipment", value: "1,80,000/-", icon: "ShoppingCart" },
        { label: "Interior", value: "1,75,000/- onwards", note: "Not included in total investment. Depends on shop size and requirements.", icon: "Layers" },
        { label: "Royalty", value: "Zero Royalty", icon: "Award" },
      ],
    },
    {
      name: "North fried chicken franchise",
      slug: "north",
      totalInvestment: "3.79 Lakhs (Excluding Interior)",
      area: "Approximately 100 to 150 sq.ft required",
      expansion: "Pan India",
      roi: "From 1st month Onwards",
      payback: "6 to 8 Months",
      royalty: "5000/- Month Only (7th Month Onwards)",
      breakdown: [
        { label: "Total Investment", value: "Rs 3,79,000/-", note: "(Franchise fee + kitchen equipment, excluding interior)", icon: "Wallet" },
        { label: "Franchise Fee", value: "Rs 1,99,000/-", icon: "IndianRupee" },
        { label: "Kitchen Equipment", value: "1,80,000/-", icon: "ShoppingCart" },
        { label: "Interior", value: "1,75,000/- onwards", note: "Not included in total investment. Depends on shop size and requirements.", icon: "Layers" },
        { label: "Royalty", value: "5000/- Month Only", note: "(7th Month Onwards)", icon: "Award" },
      ],
    },
  ],

  menus: [MENU],

  galleries: [{ name: "WeCrunch outlets", slug: "outlets", items: [{ media: "outlet-1", caption: null }, { media: "outlet-2", caption: null }] }],

  testimonials: [
    t("Arun V.", null, "“I wanted a franchise that actually works on ground.” The investment was practical, and sales started early. The model fits well for local markets."),
    t("Karthik R.", null, "“The system is clear and stress-free.” No chef required, easy menu, and smooth daily operations. My staff adapted quickly."),
    t("Praveen S.", null, "“This feels like a business we can grow long-term.” Good customer response and continuous brand support give me confidence in the future."),
    t("Ramesh K.", "Chennai", "“I never felt alone in this business.” From setup to daily operations, the WeCrunch team supported me at every step. The guidance and quick responses made everything smooth."),
    t("Suresh M.", null, "“This was my first business, and I was nervous.” WeCrunch made the process simple. Training and systems were clear, even without prior food business experience."),
  ],

  faqs: [] as { question: string; answer: string; tag?: string }[], // none on the live site

  navigation: {
    header: [
      { label: "About", href: "#about" },
      { label: "Menu", href: "#menu" },
      { label: "Profit calculator", href: "#roi-calculator" },
      { label: "Testimonials", href: "#testimonials" },
      { label: "Gallery", href: "#gallery" },
    ],
    footer: [
      { label: "Privacy Policy", href: "/privacy-policy" },
      { label: "Terms and Conditions", href: "/terms-and-conditions" },
    ],
  },

  redirects: [] as { fromPath: string; toPath: string; permanent: boolean }[],

  pages: [
    {
      slug: "home",
      title: "Home",
      seoTitle: "WeCrunch Fried Chicken Franchise",
      seoDescription: "WeCrunch fried chicken franchise: no frozen, only fresh chicken. Investment under ₹4 Lakhs + GST. Choose your state to see the franchise details.",
      phone: null,
      sections: [
        {
          type: "stateSelector",
          content: {
            heading: "Select your state", // REVIEW: new heading for accessibility
            description: "Choose your state to see franchise details for your region.", // REVIEW: new copy
            label: "States",
            placeholder: "- Select -",
            buttonLabel: "Continue",
            background: "@media:about-north",
          },
          settings: { spacing: "none" },
        },
      ] as Section[],
    },
    { slug: "tamilnadu", title: "Tamilnadu", seoTitle: STATE_SEO_TITLE, seoDescription: STATE_SEO_DESCRIPTION, phone: "+91 7418306999", sections: landingSections("tamilnadu") },
    { slug: "north", title: "North WeCrunch Franchise", seoTitle: STATE_SEO_TITLE, seoDescription: STATE_SEO_DESCRIPTION, phone: "+91 8754404554", sections: landingSections("north") },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      seoTitle: null,
      seoDescription: "How WeCrunch (DAV & MEL Hospitality Private Limited) collects, uses and protects your information.",
      phone: null,
      sections: [{ type: "richText", content: { heading: "Privacy Policy" }, contentFile: "privacy-policy.html", settings: { variant: "narrow" } }] as Section[],
    },
    {
      slug: "terms-and-conditions",
      title: "Terms and Conditions",
      seoTitle: null,
      seoDescription: "Terms governing the use of the WeCrunch website and franchise information.",
      phone: null,
      sections: [{ type: "richText", content: { heading: "Terms and Conditions" }, contentFile: "terms-and-conditions.html", settings: { variant: "narrow" } }] as Section[],
    },
  ] as { slug: string; title: string; seoTitle: string | null; seoDescription: string | null; phone: string | null; noIndex?: boolean; sections: Section[] }[],
};
