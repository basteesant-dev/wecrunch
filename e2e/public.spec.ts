import { expect, test } from "@playwright/test";

const uniquePhone = () => `9${String(Date.now()).slice(-9)}`;

test("home page routes a visitor to their state page", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Select your state");
  await page.getByLabel("States").selectOption({ label: "Kerala" });
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/kerala$/);
  await expect(page).toHaveTitle(/Kerala/);
  // Kerala uses page and keeps Kerala as its context.
  await expect(page.getByText("3.79 Lakhs (Excluding Interior)")).toBeVisible();
  await expect(page.locator("#enquiry select[name=stateSlug]")).toHaveValue("kerala");
});

test("Tamil Nadu shows its own pricing and phone line", async ({ page }) => {
  await page.goto("/tamilnadu");
  await expect(page).toHaveTitle("Tamilnadu - WeCrunch");
  await expect(page.getByText("3.80 Lakhs", { exact: true })).toBeVisible();
  await expect(page.locator('a[href="tel:+917418306999"]').first()).toBeAttached();
  await expect(page.getByText("Rs 3,80,000/-")).toBeAttached();
});

test("unknown URLs return 404", async ({ request }) => {
  expect((await request.get("/atlantis")).status()).toBe(404);
  expect((await request.get("/north/extra")).status()).toBe(404);
});

test("sitemap, robots and security headers", async ({ request }) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toContain("http://localhost:3200/kerala");
  expect(sitemap).toContain("http://localhost:3200/privacy-policy");
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /admin");
  const home = await request.get("/");
  expect(home.headers()["content-security-policy"]).toContain("frame-ancestors 'self'");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");
  const admin = await request.get("/admin/login");
  expect(admin.headers()["x-robots-tag"]).toContain("noindex");
});

test("enquiry form validates, then submits", async ({ page }) => {
  await page.goto("/kerala");
  const form = page.locator("#enquiry");
  await form.getByRole("button", { name: "Submit Enquiry" }).click();
  await expect(form.getByRole("alert")).toContainText("check the highlighted fields");

  await form.getByLabel("Name").fill("E2E Visitor");
  await form.getByRole("textbox", { name: "Email" }).fill("visitor@example.com");
  await form.getByLabel("Mobile").fill(uniquePhone());
  await form.getByLabel("City").fill("Kochi");
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Submit Enquiry" }).click();
  await expect(form.getByRole("status")).toContainText("Our franchise team will contact you shortly");
});

test("enquiry API rejects cross-site posts", async ({ request }) => {
  const r = await request.post("/api/enquiries", { data: {}, headers: { origin: "https://evil.example" } });
  expect(r.status()).toBe(403);
});

test("layout has no horizontal overflow and the menu works", async ({ page, isMobile }) => {
  await page.goto("/tamilnadu");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (isMobile) {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("navigation", { name: "Mobile" }).getByRole("link", { name: "Gallery" }).click();
    await expect(page).toHaveURL(/#gallery$/);
  }
});

test("images keep their aspect ratio and have alt text", async ({ page }) => {
  await page.goto("/tamilnadu");
  const missingAlt = await page.locator("main img:not([alt])").count();
  expect(missingAlt).toBe(0);
  const logo = page.locator("header img").first();
  const box = await logo.boundingBox();
  const natural = await logo.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight);
  expect(Math.abs(box!.width / box!.height - natural)).toBeLessThan(0.05);
});
