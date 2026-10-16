import { randomBytes } from "node:crypto";
import sharp from "sharp";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import type { MediaKind } from "@/generated/prisma/enums";

// SVG is intentionally excluded: it can carry script.
const TYPES: Record<string, { kind: MediaKind; ext: string }> = {
  "image/jpeg": { kind: "IMAGE", ext: "jpg" },
  "image/png": { kind: "IMAGE", ext: "png" },
  "image/webp": { kind: "IMAGE", ext: "webp" },
  "image/avif": { kind: "IMAGE", ext: "avif" },
  "image/gif": { kind: "IMAGE", ext: "gif" },
  "video/mp4": { kind: "VIDEO", ext: "mp4" },
  "video/webm": { kind: "VIDEO", ext: "webm" },
  "application/pdf": { kind: "DOCUMENT", ext: "pdf" },
};

export const ACCEPTED_TYPES = Object.keys(TYPES);
const MAX_MB = { IMAGE: 15, VIDEO: Number(process.env.MAX_VIDEO_MB || 100), DOCUMENT: 20 };
const MAX_DIMENSION = 10_000;
const STORED_MAX_WIDTH = 2560;

export class MediaError extends Error {}

export type ProcessedFile = { body: Buffer; mimeType: string; ext: string; kind: MediaKind; width: number | null; height: number | null };

/**
 * Validates an upload and normalises images: auto-rotated, metadata (EXIF/GPS)
 * stripped, resized to at most 2560px wide and stored as WebP. GIFs keep their format.
 * Responsive sizes and AVIF/WebP negotiation are handled by next/image at delivery.
 */
export async function processUpload(input: Buffer, declaredType: string): Promise<ProcessedFile> {
  const type = TYPES[declaredType];
  if (!type) throw new MediaError(`Unsupported file type ${declaredType || "(unknown)"}`);
  if (input.length > MAX_MB[type.kind] * 1024 * 1024) throw new MediaError(`File is larger than ${MAX_MB[type.kind]} MB`);
  if (type.kind !== "IMAGE") {
    if (type.kind === "VIDEO" && !isVideo(input)) throw new MediaError("File content is not a valid video");
    if (type.kind === "DOCUMENT" && input.subarray(0, 5).toString() !== "%PDF-") throw new MediaError("File content is not a PDF");
    return { body: input, mimeType: declaredType, ext: type.ext, kind: type.kind, width: null, height: null };
  }

  let meta;
  try {
    meta = await sharp(input).metadata(); // also rejects files that are not really images
  } catch {
    throw new MediaError("File content is not a valid image");
  }
  if (!meta.width || !meta.height) throw new MediaError("Could not read image dimensions");
  if (meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) throw new MediaError(`Image is larger than ${MAX_DIMENSION}px`);
  if (meta.format === "gif") return { body: input, mimeType: "image/gif", ext: "gif", kind: "IMAGE", width: meta.width, height: meta.height };

  const { data, info } = await sharp(input)
    .rotate()
    .resize({ width: STORED_MAX_WIDTH, withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  return { body: data, mimeType: "image/webp", ext: "webp", kind: "IMAGE", width: info.width, height: info.height };
}

function isVideo(buf: Buffer) {
  return buf.subarray(4, 8).toString() === "ftyp" || buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
}

function slugifyName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "file"
  );
}

export function sanitizeFolder(folder: string | null | undefined) {
  return (folder || "general").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "general";
}

export async function storeUpload(opts: { buffer: Buffer; type: string; filename: string; folder?: string; alt?: string; userId?: string }) {
  const file = await processUpload(opts.buffer, opts.type);
  const folder = sanitizeFolder(opts.folder);
  const now = new Date();
  const key = `${folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(6).toString("hex")}-${slugifyName(opts.filename)}.${file.ext}`;
  const driver = storage();
  const url = await driver.put(key, file.body, file.mimeType);
  return db.mediaAsset.create({
    data: {
      provider: driver.name,
      key,
      url,
      filename: opts.filename.slice(0, 200),
      mimeType: file.mimeType,
      kind: file.kind,
      size: file.body.length,
      width: file.width,
      height: file.height,
      alt: (opts.alt ?? "").slice(0, 300),
      folder,
      createdById: opts.userId,
    },
  });
}

/** Replaces the file behind an asset; every page using it picks up the new file. */
export async function replaceUpload(id: string, opts: { buffer: Buffer; type: string; filename: string }) {
  const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id } });
  const file = await processUpload(opts.buffer, opts.type);
  if (file.kind !== asset.kind) throw new MediaError(`Replacement must also be ${asset.kind.toLowerCase()}`);
  const key = asset.key.replace(/[^/]+$/, `${randomBytes(6).toString("hex")}-${slugifyName(opts.filename)}.${file.ext}`);
  const driver = storage();
  const url = await driver.put(key, file.body, file.mimeType);
  const updated = await db.mediaAsset.update({
    where: { id },
    data: { key, url, provider: driver.name, filename: opts.filename.slice(0, 200), mimeType: file.mimeType, size: file.body.length, width: file.width, height: file.height },
  });
  await storage().remove(asset.key).catch(() => {});
  return updated;
}

/** Where an asset is used. Deletion is refused while this is non-empty. */
export async function mediaUsage(id: string) {
  const like = `%"${id}"%`;
  const [sections, revisions, menuItems, galleryItems, testimonials, settings] = await Promise.all([
    db.$queryRaw<{ title: string }[]>`SELECT DISTINCT p.title FROM "PageSection" s JOIN "Page" p ON p.id = s."pageId" WHERE s.content::text LIKE ${like}`,
    db.$queryRaw<{ title: string }[]>`SELECT DISTINCT p.title FROM "PageRevision" r JOIN "Page" p ON p.id = r."pageId" WHERE r.status <> 'SUPERSEDED' AND r.snapshot::text LIKE ${like}`,
    db.menuItem.count({ where: { imageId: id } }),
    db.galleryItem.findMany({ where: { mediaId: id }, select: { gallery: { select: { name: true } } } }),
    db.testimonial.count({ where: { photoId: id } }),
    db.$queryRaw<{ id: string }[]>`SELECT id FROM "SiteSetting" WHERE data::text LIKE ${like}`,
  ]);
  const pageOg = await db.page.findMany({ where: { ogImageId: id }, select: { title: true } });
  return [
    ...new Set([
      ...sections.map((s) => `Page draft: ${s.title}`),
      ...revisions.map((s) => `Published page: ${s.title}`),
      ...pageOg.map((p) => `Social image: ${p.title}`),
      ...galleryItems.map((g) => `Gallery: ${g.gallery.name}`),
      ...(menuItems ? [`${menuItems} menu item(s)`] : []),
      ...(testimonials ? [`${testimonials} testimonial(s)`] : []),
      ...(settings.length ? ["Site settings"] : []),
    ]),
  ];
}
