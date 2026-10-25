import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import type { Transporter } from "nodemailer";
import { setTransport } from "@/lib/email";
import { notifyEnquiry, submitEnquiry } from "@/lib/enquiries";

let formId: string;
const ctx = (ip = "203.0.113.10") => ({ ip, userAgent: "vitest" });
let ipCounter = 0;
const freshIp = () => `198.51.100.${++ipCounter}`;

const valid = () => ({
  formId,
  fullName: "Asha Kumar",
  email: "  Asha@Example.com ",
  phone: "90436 11221",
  stateSlug: "kerala",
  city: "Kochi",
  message: "Interested",
  answers: { ready: "Yes, ready" },
  consent: true,
  sourcePath: "/kerala",
  attribution: { utmSource: "meta", utmCampaign: "launch", trafficSource: "meta", landingPage: "/kerala?utm_source=meta" },
});

beforeAll(async () => {
  const form = await db.enquiryForm.create({
    data: {
      name: "Test form",
      slug: "test-form",
      title: "Franchise enquiry",
      successMessage: "Thanks!",
      consentText: "I agree",
      notifyEmails: [],
      fields: [{ name: "ready", label: "Ready?", type: "radio", options: "Yes, ready\nNot ready now", required: true }],
    },
  });
  formId = form.id;
  await db.state.createMany({
    data: [
      { name: "Kerala", slug: "kerala", status: "ACTIVE" },
      { name: "Goa", slug: "goa", status: "UNAVAILABLE" },
      { name: "Hidden", slug: "hidden", status: "DRAFT" },
    ],
  });
});

beforeEach(async () => {
  await db.franchiseEnquiry.deleteMany();
  await db.rateLimit.deleteMany();
});

describe("submitEnquiry", () => {
  it("stores a normalised enquiry in this brand's database", async () => {
    const r = await submitEnquiry(valid(), ctx());
    expect(r).toMatchObject({ ok: true, message: "Thanks!", duplicate: false });
    const saved = await db.franchiseEnquiry.findFirstOrThrow();
    expect(saved).toMatchObject({
      fullName: "Asha Kumar",
      email: "asha@example.com",
      phone: "+919043611221",
      stateName: "Kerala",
      city: "Kochi",
      consent: true,
      consentText: "I agree",
      utmSource: "meta",
      utmCampaign: "launch",
      sourcePath: "/kerala",
      status: "NEW",
    });
    expect(saved.answers).toEqual({ ready: "Yes, ready" });
    expect(saved.ipHash).toMatch(/^[0-9a-f]{32}$/); // raw IP is never stored
  });

  it("returns field errors for invalid input", async () => {
    const r = await submitEnquiry({ ...valid(), phone: "123", email: "nope", answers: {}, consent: false }, ctx(freshIp()));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(Object.keys(r.fieldErrors ?? {})).toEqual(expect.arrayContaining(["email"]));
    const r2 = await submitEnquiry({ ...valid(), phone: "123456", answers: {}, consent: false }, ctx(freshIp()));
    expect(!r2.ok && r2.fieldErrors).toMatchObject({ phone: expect.any(String), ready: expect.any(String), consent: expect.any(String) });
    expect(await db.franchiseEnquiry.count()).toBe(0);
  });

  it("rejects unavailable, draft and unknown states", async () => {
    for (const stateSlug of ["goa", "hidden", "atlantis"]) {
      const r = await submitEnquiry({ ...valid(), stateSlug }, ctx(freshIp()));
      expect(r.ok, stateSlug).toBe(false);
    }
    expect(await db.franchiseEnquiry.count()).toBe(0);
  });

  it("acknowledges but does not store a duplicate within 10 minutes", async () => {
    const first = await submitEnquiry(valid(), ctx(freshIp()));
    const second = await submitEnquiry(valid(), ctx(freshIp()));
    expect(second).toMatchObject({ ok: true, duplicate: true });
    expect(first.ok && second.ok && second.enquiryId).toBe(first.ok && first.enquiryId);
    expect(await db.franchiseEnquiry.count()).toBe(1);
  });

  it("silently drops honeypot submissions", async () => {
    const r = await submitEnquiry({ ...valid(), website: "http://spam.example" }, ctx(freshIp()));
    expect(r.ok).toBe(true);
    expect(await db.franchiseEnquiry.count()).toBe(0);
  });

  it("rate limits repeated submissions from one IP", async () => {
    const ip = freshIp();
    const results = [];
    for (let i = 0; i < 6; i++) results.push(await submitEnquiry({ ...valid(), phone: `98400000${10 + i}` }, ctx(ip)));
    expect(results.slice(0, 5).every((r) => r.ok)).toBe(true);
    expect(results[5]).toMatchObject({ ok: false, status: 429 });
  });

  it("keeps enquiries when their state is deleted", async () => {
    await db.state.create({ data: { name: "Temp", slug: "temp", status: "ACTIVE" } });
    await submitEnquiry({ ...valid(), stateSlug: "temp" }, ctx(freshIp()));
    await db.state.delete({ where: { slug: "temp" } });
    const e = await db.franchiseEnquiry.findFirstOrThrow();
    expect(e.stateId).toBeNull();
    expect(e.stateName).toBe("Temp");
  });

  it("emails the sales team (and the visitor when enabled) after a submission", async () => {
    const sent: { to: string[]; subject: string; text: string }[] = [];
    setTransport({ sendMail: async (m: { to: string[]; subject: string; text: string }) => void sent.push(m) } as unknown as Transporter);
    await db.enquiryForm.update({ where: { id: formId }, data: { notifyEmails: ["sales@brand.test"], sendConfirmation: true } });
    const r = await submitEnquiry(valid(), ctx(freshIp()));
    await notifyEnquiry(r.ok ? r.enquiryId! : "", "Brand", "owner@brand.test, sales@brand.test");
    expect(sent).toHaveLength(2);
    expect(sent[0].to).toEqual(["sales@brand.test", "owner@brand.test"]);
    expect(sent[0].subject).toBe("New Brand franchise enquiry — Asha Kumar (Kerala)");
    expect(sent[0].text).toContain("Mobile: +919043611221");
    expect(sent[1].to).toEqual(["asha@example.com"]);
    setTransport(null);
  });

  it("captures Facebook Ads lead with separate UTM columns matching user sample", async () => {
    // Sample Facebook Ads lead URL:
    // https://example.com/admissions?utm_source=facebook&utm_medium=paid_social&utm_campaign=school_admissions&utm_content=video_ad_01
    const r = await submitEnquiry(
      {
        formId,
        fullName: "Rahul",
        email: "rahul@example.com",
        phone: "+919876543210",
        stateSlug: "kerala",
        city: "Kochi",
        answers: { ready: "Yes, ready" },
        consent: true,
        landing_page: "https://example.com/admissions?utm_source=facebook&utm_medium=paid_social&utm_campaign=school_admissions&utm_content=video_ad_01",
        utm_source: "facebook",
        utm_medium: "paid_social",
        utm_campaign: "school_admissions",
        utm_content: "video_ad_01",
        utm_term: "",
      },
      ctx(freshIp()),
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const lead = await db.franchiseEnquiry.findUniqueOrThrow({ where: { id: r.enquiryId! } });
    console.log("\n[WECRUNCH TEST LEAD RECORD IN DATABASE]");
    console.log(JSON.stringify({
      id: lead.id,
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone,
      utmSource: lead.utmSource,
      utmMedium: lead.utmMedium,
      utmCampaign: lead.utmCampaign,
      utmContent: lead.utmContent,
      utmTerm: lead.utmTerm,
      landingPage: lead.landingPage,
      status: lead.status,
    }, null, 2));

    expect(lead.fullName).toBe("Rahul");
    expect(lead.utmSource).toBe("facebook");
    expect(lead.utmMedium).toBe("paid_social");
    expect(lead.utmCampaign).toBe("school_admissions");
    expect(lead.utmContent).toBe("video_ad_01");
    expect(lead.utmTerm).toBeNull();
    expect(lead.landingPage).toBe("https://example.com/admissions?utm_source=facebook&utm_medium=paid_social&utm_campaign=school_admissions&utm_content=video_ad_01");
  });

  it("captures Google Ads lead with search terms and landing URL", async () => {
    const r = await submitEnquiry(
      {
        formId,
        fullName: "Google Ads Visitor",
        email: "gads@example.com",
        phone: "+919876543211",
        stateSlug: "kerala",
        city: "Ernakulam",
        answers: { ready: "Yes, ready" },
        consent: true,
        attribution: {
          utmSource: "google",
          utmMedium: "cpc",
          utmCampaign: "brand_search",
          utmTerm: "chicken_franchise_kerala",
          utmContent: "search_ad_v2",
          landingPage: "https://example.com/kerala?utm_source=google&utm_medium=cpc&utm_campaign=brand_search&utm_term=chicken_franchise_kerala&utm_content=search_ad_v2",
        },
      },
      ctx(freshIp()),
    );

    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const lead = await db.franchiseEnquiry.findUniqueOrThrow({ where: { id: r.enquiryId! } });
    expect(lead.utmSource).toBe("google");
    expect(lead.utmMedium).toBe("cpc");
    expect(lead.utmCampaign).toBe("brand_search");
    expect(lead.utmTerm).toBe("chicken_franchise_kerala");
    expect(lead.utmContent).toBe("search_ad_v2");
    expect(lead.landingPage).toContain("utm_source=google");
  });
});
