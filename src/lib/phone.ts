import { parsePhoneNumberFromString } from "libphonenumber-js/min";

// Returns E.164 (e.g. +919043611221) or null when the number is not valid.
// Bare 10-digit numbers are treated as Indian mobiles.
export function normalizePhone(input: string, defaultCountry: "IN" = "IN") {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

// "+91 90436 11221" style display, tel: links and WhatsApp links from any stored format.
export function digitsOnly(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

export function telHref(phone: string) {
  const d = digitsOnly(phone);
  return `tel:${d.startsWith("+") ? d : d.length === 10 ? `+91${d}` : `+${d}`}`;
}

export function whatsappHref(phone: string, text?: string) {
  let d = digitsOnly(phone).replace(/^\+/, "");
  if (d.length === 10) d = `91${d}`;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

/** "9043611221" → "+91 9043611221"; already-formatted numbers are kept. */
export function displayPhone(phone: string) {
  const d = digitsOnly(phone);
  return /^\d{10}$/.test(d) ? `+91 ${d}` : phone.trim();
}
