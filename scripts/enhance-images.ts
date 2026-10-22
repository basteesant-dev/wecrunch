import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SEED_DIR = path.resolve("prisma/seed-assets");
const OUT_DIR = path.resolve("prisma/enhanced-assets");

async function enhanceWeCrunch() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  console.log("Enhancing WeCrunch images...");

  // 1. about-north.jpg (State Selector image!)
  const genChickenHero = "C:/Users/Digitfellas/.gemini/antigravity-ide/brain/51b2069d-0af7-46a4-898b-fcd50645957d/wecrunch_state_selector_hero_1792702233494.jpg";
  if (await fs.stat(genChickenHero).catch(() => null)) {
    const buf = await fs.readFile(genChickenHero);
    await sharp(buf)
      .resize(1600, 1600, { fit: "cover" })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "about-north.jpg"));
    console.log("✓ Enhanced about-north.jpg (AI 8K Crispy Chicken State Selector Hero)");

    // Also update home-bg.jpg with this high-res hero
    await sharp(buf)
      .resize(1600, 1600, { fit: "cover" })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "home-bg.jpg"));
    console.log("✓ Enhanced home-bg.jpg (AI 8K Crispy Chicken Hero)");
  }

  // 2. outlet-2.webp (Flagship Night Storefront)
  const genStore = "C:/Users/Digitfellas/.gemini/antigravity-ide/brain/51b2069d-0af7-46a4-898b-fcd50645957d/wecrunch_flagship_outlet_1792702283316.jpg";
  if (await fs.stat(genStore).catch(() => null)) {
    const buf = await fs.readFile(genStore);
    await sharp(buf)
      .resize(1536, 2048, { fit: "cover" })
      .webp({ quality: 92 })
      .toFile(path.join(OUT_DIR, "outlet-2.webp"));
    console.log("✓ Enhanced outlet-2.webp (Flagship Night Storefront)");
  }

  // 3. outlet-1.avif (Color-graded & enhanced)
  const o1Meta = await sharp(path.join(SEED_DIR, "outlet-1.avif")).metadata();
  if (o1Meta.width && o1Meta.height) {
    await sharp(path.join(SEED_DIR, "outlet-1.avif"))
      .extract({ left: 0, top: 0, width: o1Meta.width, height: o1Meta.height - 80 })
      .resize({ width: 1200 })
      .modulate({ brightness: 1.05, saturation: 1.15 })
      .sharpen({ sigma: 1.2 })
      .webp({ quality: 92 })
      .toFile(path.join(OUT_DIR, "outlet-1.webp"));
    console.log("✓ Enhanced outlet-1 (Cropped fence box, upscaled to 1200p WebP)");
  }

  // 4. about-tn.jpg
  if (await fs.stat(path.join(SEED_DIR, "about-tn.jpg")).catch(() => null)) {
    await sharp(path.join(SEED_DIR, "about-tn.jpg"))
      .modulate({ brightness: 1.04, saturation: 1.15 })
      .sharpen({ sigma: 1.2 })
      .jpeg({ quality: 92 })
      .toFile(path.join(OUT_DIR, "about-tn.jpg"));
    console.log("✓ Enhanced about-tn.jpg (Color graded, sharpened)");
  }

  console.log("All WeCrunch images enhanced successfully!");
}

enhanceWeCrunch().catch(console.error);
