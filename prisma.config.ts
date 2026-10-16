import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node --import tsx prisma/seed.ts",
  },
  datasource: {
    // Only migrate/seed need a database; `prisma generate` (postinstall, CI) does not.
    // Migrations need a direct (unpooled) connection. Each pair is used together so
    // migrations always target the database the app uses: WECRUNCH_* (local, CI,
    // Docker) or the Vercel Neon integration's DATABASE_URL[_UNPOOLED].
    url: process.env.WECRUNCH_DATABASE_URL
      ? process.env.WECRUNCH_MIGRATE_DATABASE_URL || process.env.WECRUNCH_DATABASE_URL
      : process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "",
  },
});
