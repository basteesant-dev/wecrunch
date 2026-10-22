import "dotenv/config";
import { db } from "../src/lib/db";

async function main() {
  const assets = await db.mediaAsset.findMany({
    where: {
      OR: [
        { folder: "gallery" },
        { folder: "backgrounds" },
        { folder: "about" },
        { filename: { contains: "outlet" } },
        { filename: { contains: "home-bg" } },
        { filename: { contains: "about" } },
      ],
    },
    select: { id: true, filename: true, key: true, url: true, provider: true, width: true, height: true, folder: true },
  });
  console.log(`WECRUNCH ASSETS COUNT: ${assets.length}`);
  for (const a of assets) {
    console.log(`[${a.folder}] ${a.filename} (${a.width}x${a.height}) - id: ${a.id}`);
    console.log(`   url: ${a.url}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));
