import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const ADMIN = { email: "e2e-admin@wecrunch.test", password: "E2e-Admin-Pass-123" };
const EDITOR = { email: "editor@wecrunch.test", password: "Editor-Pass-456" };

async function login(page: Page, who = ADMIN) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

test.beforeEach(({ page }) => {
  page.on("dialog", (d) => d.accept());
});

test("admin requires a session and rejects wrong passwords", async ({ page, request }) => {
  await page.goto("/admin/dashboard");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator("form").getByRole("alert")).toHaveText("Email or password is incorrect.");
  expect((await request.get("/api/admin/enquiries/export")).status()).toBe(403);
  expect((await request.get("/api/admin/media")).status()).toBe(403);
});

test("edit a section, publish it, then roll back", async ({ page }) => {
  await login(page);
  await page.goto("/admin/pages");
  await page.getByRole("link", { name: "Privacy Policy" }).first().click();
  await expect(page).toHaveURL(/\/admin\/pages\/[a-z0-9]+$/);
  const builderUrl = page.url();
  await page.getByRole("link", { name: "Rich text" }).click();
  await page.getByLabel("Heading", { exact: true }).fill("Privacy Policy (updated)");
  await page.getByRole("button", { name: "Save section" }).click();
  await expect(page.getByRole("status")).toContainText("Saved to draft");

  // Drafts are not public.
  const before = await page.request.get("/privacy-policy");
  expect(await before.text()).not.toContain("Privacy Policy (updated)");

  await page.goto(builderUrl);
  await expect(page.getByText("Draft has unpublished changes")).toBeVisible();
  await page.getByLabel("Note (optional)").fill("E2E heading change");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Published version 2");
  await expect.poll(async () => (await page.request.get("/privacy-policy")).text()).toContain("Privacy Policy (updated)");

  const v1 = page.locator("li", { hasText: "v1" });
  await v1.getByRole("button", { name: "Roll back to this" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Rollback to version 1" })).toBeVisible();
  await expect.poll(async () => (await page.request.get("/privacy-policy")).text()).not.toContain("Privacy Policy (updated)");
});

test("a state set to coming soon shows the coming-soon page", async ({ page }) => {
  await login(page);
  await page.goto("/admin/states");
  await page.getByRole("link", { name: "Goa", exact: true }).click();
  await page.getByLabel("Status").selectOption("COMING_SOON");
  await page.getByLabel("Availability message").fill("WeCrunch is opening in Goa soon.");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await page.goto("/goa");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Coming soon to Goa");
  await expect(page.getByText("WeCrunch is opening in Goa soon.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit Enquiry" })).toBeVisible();
});

test("enquiries can be found, worked and exported", async ({ page }) => {
  const name = `Lead ${Date.now()}`;
  const post = await page.request.post("/api/enquiries", {
    // Signature-Agent is what ChatGPT agent sends when it fills a form for someone.
    headers: { origin: "http://localhost:3200", "signature-agent": '"https://chatgpt.com"' },
    data: {
      formId: await formId(page),
      fullName: name,
      email: "lead@example.com",
      phone: `8${String(Date.now()).slice(-9)}`,
      stateSlug: "tamilnadu",
      city: "Madurai",
      answers: {},
      consent: true,
      sourcePath: "/tamilnadu",
      attribution: { utmSource: "google", utmCampaign: "e2e", utmAdgroupName: "e2e-adgroup" },
    },
  });
  expect(post.status()).toBe(200);

  await login(page);
  await page.goto(`/admin/enquiries?q=${encodeURIComponent(name)}`);
  // Open the detail page as a fresh document: Next keeps the previous route
  // mounted (hidden), which would make "Status" ambiguous with the list filter.
  await page.goto((await page.getByRole("link", { name }).getAttribute("href"))!);
  await expect(page.getByText("Madurai")).toBeVisible();
  await expect(page.getByText("AI agent · ChatGPT")).toBeVisible();
  await expect(page.getByText("e2e-adgroup")).toBeVisible();
  await page.getByLabel("Status").selectOption("CONTACTED");
  await page.getByRole("button", { name: "Update" }).click();
  await expect(page.getByRole("status")).toContainText("Enquiry updated");
  await page.getByLabel("New note").fill("Called, interested in Madurai.");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called, interested in Madurai.")).toBeVisible();

  const csv = await (await page.request.get(`/api/admin/enquiries/export?q=${encodeURIComponent(name)}`)).text();
  expect(csv).toContain(name);
  expect(csv).toContain("Contacted");
  expect(csv).toContain("e2e");
  expect(csv).toContain("e2e-adgroup");
});

test("media can be uploaded", async ({ page }) => {
  await login(page);
  await page.goto("/admin/media");
  await page.locator('input[type=file][name=files]').setInputFiles("prisma/seed-assets/about-tn.jpg");
  await page.getByLabel(/Alt text/).fill("E2E upload");
  await page.getByRole("button", { name: "Upload", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Uploaded 1 file(s)");
  await expect(page.getByText("E2E upload").first()).toBeVisible();
});

test("roles restrict access: content editors cannot see enquiries", async ({ page, browser }) => {
  await login(page);
  await page.goto("/admin/users/new");
  await page.getByLabel("Name").fill("Content Editor");
  await page.getByLabel("Email").fill(EDITOR.email);
  await page.getByLabel("Role").selectOption("CONTENT_EDITOR");
  await page.getByLabel(/^Password/).fill(EDITOR.password);
  await page.getByRole("button", { name: "Create user" }).click();
  await expect(page).toHaveURL(/\/admin\/users\/[a-z0-9]+$/);

  const editor = await (await browser.newContext()).newPage();
  await login(editor, EDITOR);
  await editor.goto("/admin/enquiries");
  await expect(editor).toHaveURL(/denied=enquiries\.read/);
  expect((await editor.request.get("/api/admin/enquiries/export")).status()).toBe(403);
  await editor.goto("/admin/users");
  await expect(editor).toHaveURL(/denied=users\.manage/);
  await editor.goto("/admin/pages");
  await expect(editor.getByRole("heading", { name: "Pages" })).toBeVisible();

  // Module permissions are per user: granting "view enquiries" works without changing the role.
  // Reloaded as a fresh document: the hidden "new user" form would otherwise match too.
  await page.goto(page.url());
  await page.getByLabel("Enquiries — view").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  await editor.goto("/admin/enquiries");
  await expect(editor.getByRole("heading", { name: "Franchise enquiries" })).toBeVisible();
  expect((await editor.request.get("/api/admin/enquiries/export")).status()).toBe(403);
});

test("the audit log records sign-ins, publishing and exports", async ({ page }) => {
  await login(page);
  await page.goto("/admin/audit-logs");
  for (const action of ["auth.login", "page.publish", "page.rollback", "enquiry.export", "media.upload", "user.create"]) {
    await expect(page.getByText(action, { exact: true }).first()).toBeVisible();
  }
});

async function formId(page: Page) {
  await page.goto("/tamilnadu");
  return (await page.locator("form[data-form-id]").first().getAttribute("data-form-id"))!;
}
