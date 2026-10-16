import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { RESOURCES } from "@/lib/admin/resources";
import { db } from "@/lib/db";
import { fieldsSchema } from "@/lib/fields-schema";
import { MediaError, mediaUsage, processUpload, storeUpload } from "@/lib/media";
import { buildSnapshot, hasUnpublishedChanges, promoteScheduled, publishPage, rollbackTo, unpublishPage } from "@/lib/pages";
import type { PageSnapshot } from "@/lib/resolve";

async function makePage(slug: string, heading: string) {
  return db.page.create({
    data: {
      slug,
      title: slug,
      sections: { create: [{ type: "richText", sortOrder: 0, content: { heading, body: "<p>Body</p>" }, settings: {} }] },
    },
  });
}
const liveHeading = async (pageId: string) => {
  const rev = await db.pageRevision.findFirst({ where: { pageId, status: "PUBLISHED" } });
  return rev ? (rev.snapshot as unknown as PageSnapshot).sections[0].content.heading : null;
};

describe("publishing workflow", () => {
  it("publishes, edits as draft, and rolls back", async () => {
    const page = await makePage("p-flow", "Version one");
    expect(await hasUnpublishedChanges(page.id)).toBe(true);
    const v1 = await publishPage(page.id, null);
    expect(v1.ok).toBe(true);
    expect(await liveHeading(page.id)).toBe("Version one");
    expect(await hasUnpublishedChanges(page.id)).toBe(false);

    await db.pageSection.updateMany({ where: { pageId: page.id }, data: { content: { heading: "Version two", body: "<p>Body</p>" } } });
    expect(await hasUnpublishedChanges(page.id)).toBe(true);
    expect(await liveHeading(page.id)).toBe("Version one"); // drafts never leak
    await publishPage(page.id, null);
    expect(await liveHeading(page.id)).toBe("Version two");

    const first = await db.pageRevision.findFirstOrThrow({ where: { pageId: page.id, version: 1 } });
    const rolled = await rollbackTo(first.id, null);
    expect(rolled.version).toBe(3);
    expect(await liveHeading(page.id)).toBe("Version one");
    const draft = await db.pageSection.findFirstOrThrow({ where: { pageId: page.id } });
    expect((draft.content as { heading: string }).heading).toBe("Version one");
    expect(await db.pageRevision.count({ where: { pageId: page.id, status: "PUBLISHED" } })).toBe(1);
  });

  it("schedules publication and promotes it when due", async () => {
    const page = await makePage("p-scheduled", "Later");
    const at = new Date(Date.now() + 60 * 60_000);
    const r = await publishPage(page.id, null, { publishAt: at });
    expect(r.ok && r.scheduled).toBe(true);
    expect(await liveHeading(page.id)).toBeNull();
    expect(await promoteScheduled(new Date())).toBe(0);
    expect(await promoteScheduled(new Date(at.getTime() + 1000))).toBe(1);
    expect(await liveHeading(page.id)).toBe("Later");
    expect((await db.page.findUniqueOrThrow({ where: { id: page.id } })).status).toBe("PUBLISHED");
  });

  it("unpublishes", async () => {
    const page = await makePage("p-off", "Bye");
    await publishPage(page.id, null);
    await unpublishPage(page.id);
    expect(await liveHeading(page.id)).toBeNull();
    expect((await db.page.findUniqueOrThrow({ where: { id: page.id } })).status).toBe("UNPUBLISHED");
  });

  it("refuses to publish invalid sections", async () => {
    const page = await db.page.create({
      data: { slug: "p-bad", title: "Bad", sections: { create: [{ type: "cta", sortOrder: 0, content: { heading: "", buttonHref: "javascript:alert(1)" }, settings: {} }] } },
    });
    const r = await publishPage(page.id, null);
    expect(r.ok).toBe(false);
    expect((await buildSnapshot(page.id)).errors[0]).toMatch(/Section 1 \(cta\)/);
  });
});

describe("content resources", () => {
  it("saves a state with cities and enforces unique slugs", async () => {
    const r = RESOURCES.states;
    const values = fieldsSchema(r.fields).parse({ name: "Karnataka", slug: "karnataka", status: "COMING_SOON", cities: [{ name: "Bengaluru" }, { name: "Mysuru", hidden: true }, { name: "Bengaluru" }] });
    expect(await r.check!(values, null)).toBeNull();
    const id = await db.$transaction((tx) => r.save(tx, null, values));
    const cities = await db.city.findMany({ where: { stateId: id }, orderBy: { sortOrder: "asc" } });
    expect(cities.map((c) => [c.name, c.isActive])).toEqual([["Bengaluru", true], ["Mysuru", false]]);
    const clash = fieldsSchema(r.fields).parse({ name: "Other", slug: "karnataka" });
    expect(await r.check!(clash, null)).toMatch(/already used/);
  });

  it("refuses to delete a franchise model that a page uses", async () => {
    const r = RESOURCES.franchise;
    const v = fieldsSchema(r.fields).parse({ name: "Model", slug: "model-used", totalInvestment: "3 Lakhs", breakdown: [{ label: "Fee", value: "1" }] });
    const id = await db.$transaction((tx) => r.save(tx, null, v));
    await db.page.create({ data: { slug: "uses-model", title: "Uses model", sections: { create: [{ type: "investment", sortOrder: 0, content: { modelId: id }, settings: {} }] } } });
    expect(await r.remove(id)).toMatch(/used by page "Uses model"/);
  });
});

describe("media", () => {
  it("rejects files whose content does not match the declared type", async () => {
    await expect(processUpload(Buffer.from("<svg onload=alert(1)>"), "image/svg+xml")).rejects.toBeInstanceOf(MediaError);
    await expect(processUpload(Buffer.from("not really a png"), "image/png")).rejects.toThrow(/not a valid image/);
  });

  it("stores images as WebP without metadata and blocks deleting assets in use", async () => {
    const jpg = await readFile(path.resolve("prisma/seed-assets/about-tn.jpg"));
    const asset = await storeUpload({ buffer: jpg, type: "image/jpeg", filename: "About photo.JPG", folder: "Tests!", alt: "Tea" });
    expect(asset.mimeType).toBe("image/webp");
    expect(asset.folder).toBe("tests");
    expect(asset.width).toBeLessThanOrEqual(2560);
    expect(asset.url).toMatch(/^\/media\/tests\/\d{4}\/\d{2}\/[0-9a-f]+-about-photo\.webp$/);
    expect(await mediaUsage(asset.id)).toEqual([]);
    await db.gallery.create({ data: { name: "G", slug: "g-media", items: { create: [{ mediaId: asset.id }] } } });
    expect(await mediaUsage(asset.id)).toEqual(["Gallery: G"]);
  });
});
