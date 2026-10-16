import { describe, expect, it } from "vitest";
import { csvCell } from "@/lib/admin/enquiry-filters";
import { detectTrafficSource } from "@/lib/attribution";
import { hashPassword, passwordProblems, verifyPassword } from "@/lib/crypto";
import { fieldsSchema } from "@/lib/fields-schema";
import { validateAnswers, type Question } from "@/lib/forms";
import { can } from "@/lib/permissions";
import { displayPhone, normalizeEmail, normalizePhone, telHref, whatsappHref } from "@/lib/phone";
import { validateSection } from "@/lib/sections/validate";

describe("field validation", () => {
  const schema = fieldsSchema([
    { name: "title", label: "Title", type: "text", required: true },
    { name: "link", label: "Link", type: "url" },
    { name: "body", label: "Body", type: "richtext" },
    { name: "items", label: "Items", type: "list", fields: [{ name: "text", label: "Text", type: "text", required: true }] },
  ]);

  it("requires required fields and fills defaults", () => {
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.parse({ title: "Hi" })).toEqual({ title: "Hi", link: "", body: "", items: [] });
  });

  it("rejects script URLs", () => {
    for (const link of ["javascript:alert(1)", "data:text/html,x", "//evil.example"]) {
      expect(schema.safeParse({ title: "x", link }).success, link).toBe(false);
    }
    for (const link of ["/kerala", "#about", "https://wa.me/91", "tel:+919043611221", "mailto:a@b.in"]) {
      expect(schema.safeParse({ title: "x", link }).success, link).toBe(true);
    }
  });

  it("sanitises rich text", () => {
    const out = schema.parse({ title: "x", body: '<p onclick="x()">Hi<script>alert(1)</script><a href="javascript:x">l</a></p>' });
    expect(out.body).toBe("<p>Hi<a>l</a></p>");
  });

  it("validates nested list items", () => {
    expect(schema.safeParse({ title: "x", items: [{ text: "" }] }).success).toBe(false);
  });
});

describe("section validation", () => {
  it("rejects unknown section types", () => {
    expect(validateSection("evilWidget", {}, {}).ok).toBe(false);
  });
  it("rejects anchor ids with markup", () => {
    expect(validateSection("richText", { body: "<p>x</p>" }, { anchorId: '"><script>' }).ok).toBe(false);
  });
  it("accepts a valid hero", () => {
    const v = validateSection("hero", { heading: "Start", formId: "abc123" }, { variant: "form-right" });
    expect(v.ok).toBe(true);
  });
});

describe("enquiry answers", () => {
  const qs: Question[] = [
    { name: "ready", label: "Ready?", type: "radio", options: "Yes\nNo", required: true },
    { name: "extras", label: "Extras", type: "checkboxes", options: "A\nB", required: false },
    { name: "note", label: "Note", type: "text", options: "", required: false },
  ];
  it("accepts valid answers and drops unknown keys", () => {
    expect(validateAnswers(qs, { ready: "Yes", extras: ["B"], other: "x" })).toEqual({ answers: { ready: "Yes", extras: ["B"] }, errors: {} });
  });
  it("rejects missing required and invented choices", () => {
    expect(validateAnswers(qs, {}).errors.ready).toBeTruthy();
    expect(validateAnswers(qs, { ready: "Maybe" }).errors.ready).toBe("Invalid choice");
    expect(validateAnswers(qs, { ready: "Yes", extras: ["Z"] }).errors.extras).toBe("Invalid choice");
  });
});

describe("phone and email normalisation", () => {
  it("normalises Indian mobiles to E.164", () => {
    expect(normalizePhone("90436 11221")).toBe("+919043611221");
    expect(normalizePhone("+91-98407-33822")).toBe("+919840733822");
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizeEmail("  Lead@Example.COM ")).toBe("lead@example.com");
  });
  it("builds links and display strings", () => {
    expect(telHref("9043611221")).toBe("tel:+919043611221");
    expect(whatsappHref("+91 98407 33822")).toBe("https://wa.me/919840733822");
    expect(displayPhone("9043611221")).toBe("+91 9043611221");
    expect(displayPhone("+91 98407 33822")).toBe("+91 98407 33822");
  });
});

describe("traffic source detection", () => {
  const p = (q: string) => new URLSearchParams(q);
  it("prefers UTM, then ad click ids, then referrer", () => {
    expect(detectTrafficSource(p("utm_source=meta&gclid=1"), "", "wecrunchfranchise.com")).toBe("meta");
    expect(detectTrafficSource(p("gclid=1"), "", "wecrunchfranchise.com")).toBe("google_ads");
    expect(detectTrafficSource(p("fbclid=1"), "", "wecrunchfranchise.com")).toBe("facebook_ads");
    expect(detectTrafficSource(p(""), "", "wecrunchfranchise.com")).toBe("direct");
    expect(detectTrafficSource(p(""), "https://www.google.com/", "wecrunchfranchise.com")).toBe("organic_search");
    expect(detectTrafficSource(p(""), "https://l.instagram.com/x", "wecrunchfranchise.com")).toBe("social");
    expect(detectTrafficSource(p(""), "https://blog.example.com/a", "wecrunchfranchise.com")).toBe("referral");
  });
});

describe("CSV export cells", () => {
  it("quotes and neutralises formula injection", () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+919043611221")).toBe("\"'+919043611221\"");
    expect(csvCell(["a", "b"])).toBe('"a; b"');
    expect(csvCell(null)).toBe('""');
  });
});

describe("passwords and roles", () => {
  it("hashes and verifies with scrypt", async () => {
    const hash = await hashPassword("Correct-Horse-9");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("Correct-Horse-9", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });
  it("enforces password strength", () => {
    expect(passwordProblems("short")).not.toHaveLength(0);
    expect(passwordProblems("LongEnough123")).toHaveLength(0);
  });
  it("limits roles to their areas", () => {
    expect(can("CONTENT_EDITOR", "enquiries.read")).toBe(false);
    expect(can("ENQUIRY_MANAGER", "content.manage")).toBe(false);
    expect(can("ENQUIRY_MANAGER", "enquiries.export")).toBe(true);
    expect(can("SUPER_ADMIN", "users.manage")).toBe(true);
  });
});
