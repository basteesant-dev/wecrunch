import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { db } from "../src/lib/db";
import { replaceUpload } from "../src/lib/media";
import { revalidateCms } from "../src/lib/revalidate";

const ENHANCED_DIR = path.resolve("prisma/enhanced-assets");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

async function syncMedia() {
  console.log("Starting WeCrunch enhanced media upload to Vercel Blob & DB sync...");
  const files = await fs.readdir(ENHANCED_DIR);

  for (const file of files) {
    const ext = file.split(".").pop()?.toLowerCase() ?? "jpg";
    const mime = MIME[ext] || "image/jpeg";
    const fullPath = path.join(ENHANCED_DIR, file);
    const buffer = await fs.readFile(fullPath);

    // Look up existing asset in database (handle outlet-1.avif vs outlet-1.webp)
    const baseName = file.replace(/\.[^.]+$/, "");
    const asset = await db.mediaAsset.findFirst({
      where: {
        OR: [
          { filename: file },
          { filename: { startsWith: baseName } },
        ],
      },
    });

    if (!asset) {
      console.warn(`  Skipping ${file}: No existing MediaAsset record found matching ${baseName}`);
      continue;
    }

    console.log(`Uploading & replacing [${asset.id}] ${asset.filename} with enhanced ${file}...`);
    try {
      const updated = await replaceUpload(asset.id, {
        buffer,
        type: mime,
        filename: file,
      });
      console.log(`  ✓ Updated ${asset.filename} -> URL: ${updated.url} (${updated.width}x${updated.height})`);
    } catch (err: any) {
      console.error(`  ✗ Error replacing ${file}:`, err.message);
    }
  }

  // Copy into seed-assets as well
  for (const file of files) {
    const src = path.join(ENHANCED_DIR, file);
    const dest = path.join(path.resolve("prisma/seed-assets"), file);
    await fs.copyFile(src, dest).catch(() => {});
  }
  console.log("✓ Copied enhanced files into prisma/seed-assets/");

  try {
    revalidateCms();
    console.log("✓ CMS cache revalidated.");
  } catch {
    // ignore outside Next.js request context
  }

  console.log("WeCrunch media sync completed successfully!");
}

syncMedia()
  .catch(console.error)
  .finally(() => process.exit(0));
