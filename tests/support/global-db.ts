// Starts a throwaway PostgreSQL (embedded binaries), applies the real
// migrations, and hands the URL to the integration tests.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";
import type { TestProject } from "vitest/node";

declare module "vitest" {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}

export default async function setup(project: TestProject) {
  const dir = mkdtempSync(path.join(os.tmpdir(), "wecrunch-test-db-"));
  const port = 55000 + Math.floor(Math.random() * 900);
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "test", port, persistent: false, initdbFlags: ["--locale=C", "--encoding=UTF8"] });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("wecrunch_test");
  const url = `postgresql://postgres:test@localhost:${port}/wecrunch_test`;
  // Both set explicitly: .env must never redirect test migrations to a real database.
  const env = { ...process.env, WECRUNCH_DATABASE_URL: url, WECRUNCH_MIGRATE_DATABASE_URL: url };
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env, stdio: "pipe" });
  // Fails the run if schema.prisma has changes that no migration captures.
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"], { env, stdio: "pipe" });
  project.provide("databaseUrl", url);
  return async () => {
    await pg.stop();
    rmSync(dir, { recursive: true, force: true });
  };
}
