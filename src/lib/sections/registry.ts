import type { Field } from "@/lib/fields";

// Every section type the page builder supports. Adding a type here plus a
// renderer in components/site/sections is all it takes; no new tables.

export type SectionType = {
  label: string;
  description: string;
  fields: Field[];
  variants?: { value: string; label: string }[];
};

const heading: Field[] = [
  { name: "heading", label: "Heading", type: "text" },
  { name: "highlight", label: "Highlighted words", type: "text", help: "Part of the heading shown in the brand colour" },
];

const source = (kind: "testimonial" | "faq"): Field[] => [
  {
    name: "source",
    label: "Which items",
    type: "select",
    options: [
      { value: "all", label: "All published" },
      { value: "tag", label: "Published items with tag" },
      { value: "selected", label: "Hand-picked" },
    ],
  },
  { name: "tag", label: "Tag", type: "text", help: "Used when 'Which items' is 'with tag'" },
  { name: kind === "testimonial" ? "testimonialIds" : "faqIds", label: "Hand-picked items", type: "ref", ref: kind, multiple: true },
];

export const SECTION_TYPES = {
  stateSelector: {
    label: "State selector",
    description: "Full-screen state selection that routes visitors to their state page.",
    fields: [
      { name: "heading", label: "Heading", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
      { name: "label", label: "Field label", type: "text", required: true },
      { name: "placeholder", label: "Placeholder option", type: "text" },
      { name: "buttonLabel", label: "Button label", type: "text", required: true },
      { name: "background", label: "Background image", type: "image" },
    ],
  },
  hero: {
    label: "Hero with enquiry form",
    description: "Headline, phone call-to-action and the franchise enquiry form.",
    variants: [
      { value: "form-right", label: "Form on the right" },
      { value: "centered", label: "Centred, no form" },
    ],
    fields: [
      { name: "tagline", label: "Large tagline", type: "text" },
      { name: "backdropText", label: "Background text", type: "text", help: "Oversized lettering behind the hero, e.g. a brand line. Start a new line after a full stop." },
      { name: "eyebrow", label: "Pill text", type: "text" },
      { name: "heading", label: "Heading", type: "text", required: true },
      { name: "highlight", label: "Highlighted words", type: "text" },
      { name: "priceTag", label: "Price tag", type: "text", help: "Shown as a tag after the heading, e.g. ₹3.75 Lakhs + GST" },
      { name: "background", label: "Background image", type: "image" },
      { name: "showPhoneCta", label: "Show phone button", type: "boolean" },
      { name: "formId", label: "Enquiry form", type: "ref", ref: "form" },
      { name: "formTitle", label: "Form title", type: "text" },
    ],
  },
  features: {
    label: "Feature list",
    description: "Icon + text list, e.g. 'Why choose us'.",
    fields: [
      ...heading,
      { name: "items", label: "Items", type: "list", itemLabel: "text", fields: [
        { name: "icon", label: "Icon", type: "icon" },
        { name: "text", label: "Text", type: "text", required: true },
      ] },
    ],
  },
  about: {
    label: "Image + story",
    description: "Image beside a heading and rich text.",
    fields: [
      ...heading,
      { name: "body", label: "Text", type: "richtext" },
      { name: "image", label: "Image", type: "image" },
      { name: "imagePosition", label: "Image position", type: "select", options: [
        { value: "left", label: "Left" },
        { value: "right", label: "Right" },
      ] },
    ],
  },
  marquee: {
    label: "Scrolling ticker",
    description: "A band of short phrases that scrolls horizontally.",
    fields: [
      { name: "items", label: "Phrases", type: "list", itemLabel: "text", fields: [
        { name: "text", label: "Text", type: "text", required: true },
      ] },
      { name: "reverse", label: "Scroll right-to-left", type: "boolean" },
    ],
  },
  stats: {
    label: "Statistics",
    description: "Counters such as outlets, states and customers.",
    fields: [
      ...heading,
      { name: "items", label: "Counters", type: "list", itemLabel: "label", fields: [
        { name: "value", label: "Number", type: "number", min: 0 },
        { name: "suffix", label: "Suffix", type: "text", help: "e.g. +" },
        { name: "label", label: "Label", type: "text", required: true },
      ] },
    ],
  },
  franchiseFacts: {
    label: "Franchise facts",
    description: "Area, investment, ROI and payback from a franchise model.",
    fields: [
      ...heading,
      { name: "intro", label: "Intro", type: "richtext" },
      { name: "modelId", label: "Franchise model", type: "ref", ref: "franchiseModel", required: true },
      { name: "showRoyalty", label: "Show royalty card", type: "boolean" },
    ],
  },
  support: {
    label: "Support grid",
    description: "Cards with an icon, title and optional text.",
    fields: [
      { name: "eyebrow", label: "Pill text", type: "text" },
      ...heading,
      { name: "items", label: "Cards", type: "list", itemLabel: "title", fields: [
        { name: "icon", label: "Icon", type: "icon" },
        { name: "title", label: "Title", type: "text", required: true },
        { name: "text", label: "Text", type: "textarea" },
      ] },
    ],
  },
  gallery: {
    label: "Gallery",
    description: "Images from a gallery.",
    variants: [
      { value: "portrait", label: "Portrait tiles" },
      { value: "landscape", label: "Landscape tiles" },
    ],
    fields: [...heading, { name: "galleryId", label: "Gallery", type: "ref", ref: "gallery", required: true }],
  },
  checklist: {
    label: "Checklist",
    description: "Ticked list, e.g. what we look for in partners.",
    fields: [
      { name: "eyebrow", label: "Small heading", type: "text" },
      ...heading,
      { name: "items", label: "Items", type: "list", itemLabel: "text", fields: [
        { name: "text", label: "Text", type: "text", required: true },
      ] },
    ],
  },
  investment: {
    label: "Investment breakup",
    description: "Cost breakdown of a franchise model.",
    fields: [...heading, { name: "modelId", label: "Franchise model", type: "ref", ref: "franchiseModel", required: true }],
  },
  roiCalculator: {
    label: "ROI calculator",
    description: "Sales scenarios plus an editable profit and payback calculator.",
    fields: [
      { name: "eyebrow", label: "Small heading", type: "text" },
      ...heading,
      { name: "intro", label: "Intro", type: "textarea" },
      { name: "investment", label: "Total investment (₹)", type: "number", min: 0, help: "Used for the payback period" },
      { name: "daysPerMonth", label: "Trading days per month", type: "number", min: 1, max: 31 },
      { name: "defaultScenario", label: "Scenario the calculator starts on", type: "number", min: 1, max: 4, help: "1 = first scenario" },
      { name: "scenarios", label: "Projections / scenarios", type: "list", itemLabel: "label", max: 4, fields: [
        { name: "label", label: "Name", type: "text", required: true, help: "e.g. Projection 1" },
        { name: "subtitle", label: "Format / size", type: "text", help: "e.g. Take Away (100-120 sqft)" },
        { name: "dailySales", label: "Expected sales per day (₹)", type: "number", min: 0 },
        { name: "salary", label: "Staff salary per month (₹)", type: "number", min: 0 },
        { name: "rent", label: "Rent per month (₹)", type: "number", min: 0 },
        { name: "electricity", label: "Electricity bill per month (₹)", type: "number", min: 0 },
        { name: "royalty", label: "Royalty per month (₹)", type: "number", min: 0, help: "0 shows as Nil" },
      ] },
      { name: "variableCosts", label: "Costs as % of sales (e.g. food cost)", type: "list", itemLabel: "label", fields: [
        { name: "label", label: "Name", type: "text", required: true },
        { name: "percent", label: "% of sales", type: "number", min: 0, max: 100 },
        { name: "note", label: "Note", type: "text" },
      ] },
      { name: "disclaimer", label: "Disclaimer", type: "textarea" },
    ],
  },
  menuCard: {
    label: "Menu card",
    description: "The menu in the printed card style, with a link to the menu card image.",
    fields: [
      ...heading,
      { name: "image", label: "Menu card image", type: "image" },
      { name: "menuId", label: "Menu", type: "ref", ref: "menu" },
      { name: "panelTitle", label: "Brand panel line 1", type: "text", help: "e.g. 480+ Outlets" },
      { name: "panelSubtitle", label: "Brand panel line 2", type: "text", help: "e.g. All over India" },
      { name: "panelNote", label: "Brand panel note", type: "text", help: "Shown above the phone numbers, e.g. For franchise:" },
    ],
  },
  menuShowcase: {
    label: "Menu showcase",
    description: "Grid of signature products.",
    fields: [
      ...heading,
      { name: "items", label: "Products", type: "list", itemLabel: "label", fields: [
        { name: "image", label: "Image", type: "image", required: true },
        { name: "label", label: "Name", type: "text" },
      ] },
    ],
  },
  testimonials: {
    label: "Testimonials",
    description: "Franchise partner stories.",
    fields: [{ name: "eyebrow", label: "Small heading", type: "text" }, ...heading, ...source("testimonial")],
  },
  videos: {
    label: "Videos",
    description: "Uploaded videos with poster images.",
    fields: [
      ...heading,
      { name: "items", label: "Videos", type: "list", itemLabel: "title", fields: [
        { name: "video", label: "Video file", type: "video", required: true },
        { name: "poster", label: "Poster image", type: "image" },
        { name: "title", label: "Accessible title", type: "text" },
      ] },
    ],
  },
  faq: {
    label: "FAQs",
    description: "Questions and answers.",
    fields: [...heading, ...source("faq")],
  },
  richText: {
    label: "Rich text",
    description: "Free-form formatted text, e.g. legal pages.",
    variants: [
      { value: "narrow", label: "Narrow" },
      { value: "wide", label: "Wide" },
    ],
    fields: [{ name: "heading", label: "Heading", type: "text" }, { name: "body", label: "Text", type: "richtext", required: true }],
  },
  cta: {
    label: "Call to action / offer",
    description: "Banner with a message and a button.",
    fields: [
      { name: "heading", label: "Heading", type: "text", required: true },
      { name: "text", label: "Text", type: "textarea" },
      { name: "buttonLabel", label: "Button label", type: "text" },
      { name: "buttonHref", label: "Button link", type: "url" },
      { name: "image", label: "Background image", type: "image" },
    ],
  },
  enquiryForm: {
    label: "Enquiry form",
    description: "Standalone franchise enquiry form.",
    fields: [...heading, { name: "text", label: "Text", type: "textarea" }, { name: "formId", label: "Form", type: "ref", ref: "form", required: true }],
  },
  contact: {
    label: "Contact details",
    description: "Address, phone, email and map from site settings and state overrides.",
    fields: [...heading, { name: "showMap", label: "Show map", type: "boolean" }],
  },
} satisfies Record<string, SectionType>;

export type SectionTypeKey = keyof typeof SECTION_TYPES;

export function isSectionType(type: string): type is SectionTypeKey {
  return Object.hasOwn(SECTION_TYPES, type);
}

export const SECTION_SETTINGS_FIELDS = (type: SectionTypeKey): Field[] => {
  const def: SectionType = SECTION_TYPES[type];
  return [
    { name: "anchorId", label: "Anchor ID", type: "text", help: "Lets menus link to #anchor (letters, numbers, dashes)" },
    { name: "background", label: "Background", type: "select", options: [
      { value: "default", label: "Section default" },
      { value: "light", label: "Light" },
      { value: "muted", label: "Muted" },
      { value: "dark", label: "Dark" },
      { value: "brand", label: "Brand colour" },
    ] },
    { name: "spacing", label: "Vertical spacing", type: "select", options: [
      { value: "md", label: "Medium" },
      { value: "sm", label: "Small" },
      { value: "lg", label: "Large" },
      { value: "none", label: "None" },
    ] },
    ...(def.variants ? [{ name: "variant", label: "Layout", type: "select" as const, options: def.variants }] : []),
  ];
};
