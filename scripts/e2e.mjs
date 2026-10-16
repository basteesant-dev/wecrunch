// End-to-end run against a production build and a throwaway database:
//   embedded PostgreSQL → migrate → seed → next build → playwright test
// Usage: npm run test:e2e [-- <playwright args>]
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const port = 56000 + Math.floor(Math.random() * 900);
const dir = mkdtempSync(path.join(os.tmpdir(), "wecrunch-e2e-db-"));
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "e2e", port, persistent: false, initdbFlags: ["--locale=C", "--encoding=UTF8"] });

const env = {
  ...process.env,
  WECRUNCH_DATABASE_URL: `postgresql://postgres:e2e@localhost:${port}/wecrunch_e2e`,
  WECRUNCH_MIGRATE_DATABASE_URL: `postgresql://postgres:e2e@localhost:${port}/wecrunch_e2e`,
  SITE_URL: "http://localhost:3200",
  APP_SECRET: "e2e-secret-e2e-secret-e2e-secret-e2e-secret",
  CRON_SECRET: "e2e-cron-secret",
  ADMIN_EMAIL: "e2e-admin@wecrunch.test",
  ADMIN_PASSWORD: "E2e-Admin-Pass-123",
  ADMIN_NAME: "E2E Admin",
  STORAGE_DRIVER: "local",
  LOCAL_UPLOAD_DIR: "./storage/e2e-uploads",
  NEXT_DIST_DIR: ".next-e2e",
  SMTP_HOST: "",
  TURNSTILE_SECRET_KEY: "",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
};

function run(label, args, extraEnv = {}) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, args, { stdio: "inherit", env: { ...env, ...extraEnv } });
  if (r.status !== 0) throw new Error(`${label} failed (${r.status})`);
}

let code = 1;
try {
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("wecrunch_e2e");
  rmSync("storage/e2e-uploads", { recursive: true, force: true });
  run("migrate", ["node_modules/prisma/build/index.js", "migrate", "deploy"]);
  run("seed", ["--import", "tsx", "prisma/seed.ts"]);
  run("build", ["node_modules/next/dist/bin/next", "build"], { NODE_ENV: "production" });
  const r = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)], { stdio: "inherit", env });
  code = r.status ?? 1;
} catch (e) {
  console.error(e.message);
} finally {
  await pg.stop().catch(() => {});
  rmSync(dir, { recursive: true, force: true });
}
process.exit(code);
