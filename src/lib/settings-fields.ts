import type { Field } from "@/lib/fields";

// Site-wide settings (one row, validated JSON). Edited at /admin/settings.
export const SETTINGS_GROUPS: { title: string; fields: Field[] }[] = [
  {
    title: "Brand",
    fields: [
      { name: "siteName", label: "Site name", type: "text", required: true },
      { name: "tagline", label: "Tagline", type: "text" },
      { name: "logo", label: "Logo", type: "image" },
      { name: "logoAlt", label: "Logo alt text", type: "text" },
      { name: "favicon", label: "Favicon (square PNG)", type: "image" },
      { name: "companyName", label: "Legal company name", type: "text" },
      { name: "copyright", label: "Footer copyright line", type: "text" },
    ],
  },
  {
    title: "Contact",
    fields: [
      { name: "phone", label: "Primary phone", type: "text", required: true },
      { name: "phoneSecondary", label: "Secondary phone", type: "text" },
      { name: "whatsapp", label: "WhatsApp number", type: "text", help: "Defaults to the primary phone" },
      { name: "email", label: "Email", type: "text", required: true },
      { name: "address", label: "Address", type: "textarea" },
      { name: "mapQuery", label: "Google Maps search text", type: "text", help: "Usually the address" },
      { name: "socials", label: "Social links", type: "list", itemLabel: "platform", fields: [
        { name: "platform", label: "Platform", type: "select", options: [
          { value: "instagram", label: "Instagram" },
          { value: "facebook", label: "Facebook" },
          { value: "youtube", label: "YouTube" },
          { value: "linkedin", label: "LinkedIn" },
          { value: "x", label: "X / Twitter" },
        ] },
        { name: "url", label: "URL", type: "url", required: true },
      ] },
    ],
  },
  {
    title: "Announcement bar",
    fields: [
      { name: "announcementEnabled", label: "Show announcement bar", type: "boolean" },
      { name: "announcementText", label: "Text", type: "text" },
      { name: "announcementHref", label: "Link", type: "url" },
    ],
  },
  {
    title: "SEO defaults",
    fields: [
      { name: "titleTemplate", label: "Title template", type: "text", help: "%s is replaced by the page title" },
      { name: "defaultSeoTitle", label: "Default title", type: "text" },
      { name: "defaultSeoDescription", label: "Default description", type: "textarea", max: 300 },
      { name: "ogImage", label: "Default social sharing image", type: "image" },
    ],
  },
  {
    title: "Enquiries",
    fields: [
      { name: "defaultFormId", label: "Default form (state pages without a landing page)", type: "ref", ref: "form" },
      { name: "notifyEmails", label: "Sales team emails (comma separated)", type: "text" },
      { name: "retentionDays", label: "Anonymise closed enquiries after (days, 0 = never)", type: "number", min: 0, max: 3650 },
      { name: "chooseStateText", label: "'Change state' link text", type: "text" },
    ],
  },
  {
    title: "Analytics (loaded only when set)",
    fields: [
      { name: "gtmId", label: "Google Tag Manager ID", type: "text", help: "GTM-XXXXXXX" },
      { name: "gaId", label: "Google Analytics 4 ID", type: "text", help: "G-XXXXXXX" },
      { name: "metaPixelId", label: "Meta Pixel ID", type: "text" },
      { name: "clarityId", label: "Microsoft Clarity ID", type: "text" },
    ],
  },
];

export const SETTINGS_FIELDS: Field[] = SETTINGS_GROUPS.flatMap((g) => g.fields);

export type SiteSettings = {
  siteName: string;
  tagline: string;
  logo: string;
  logoAlt: string;
  favicon: string;
  companyName: string;
  copyright: string;
  phone: string;
  phoneSecondary: string;
  whatsapp: string;
  email: string;
  address: string;
  mapQuery: string;
  socials: { platform: string; url: string }[];
  announcementEnabled: boolean;
  announcementText: string;
  announcementHref: string;
  titleTemplate: string;
  defaultSeoTitle: string;
  defaultSeoDescription: string;
  ogImage: string;
  defaultFormId: string;
  notifyEmails: string;
  retentionDays: number;
  chooseStateText: string;
  gtmId: string;
  gaId: string;
  metaPixelId: string;
  clarityId: string;
};

// Analytics IDs are interpolated into script URLs, so restrict their shape.
export const ANALYTICS_ID = /^[A-Za-z0-9-]{0,40}$/;
