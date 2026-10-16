// Local development PostgreSQL using the embedded-postgres binaries.
// Not for production. Creates a least-privilege role that owns only the WeCrunch DB.
//   node scripts/db.mjs            start (Ctrl+C to stop)
import EmbeddedPostgres from "embedded-postgres";
import path from "node:path";
import fs from "node:fs";
import "dotenv/config";

const port = Number(process.env.DEV_DB_PORT || 5434);
const dataDir = path.resolve(".data/postgres");
const url = new URL(process.env.WECRUNCH_DATABASE_URL || "postgresql://wecrunch_app:change-me@localhost:5434/wecrunch");
const appUser = decodeURIComponent(url.username);
const appPassword = decodeURIComponent(url.password);
const dbName = url.pathname.slice(1);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: process.env.DEV_DB_SUPERUSER_PASSWORD || "postgres-dev-only",
  port,
  persistent: true,
  initdbFlags: ["--locale=C", "--encoding=UTF8"],
});

if (!fs.existsSync(path.join(dataDir, "PG_VERSION"))) await pg.initialise();
await pg.start();

const client = pg.getPgClient();
await client.connect();
const role = await client.query("select 1 from pg_roles where rolname = $1", [appUser]);
const pw = appPassword.replace(/'/g, "''");
// CREATEDB is only granted locally so `prisma migrate dev` can use a shadow database.
// Password is re-synced every start so editing .env never leaves a stale role password.
await client.query(`${role.rowCount ? "alter" : "create"} role "${appUser}" login createdb password '${pw}'`);
const db = await client.query("select 1 from pg_database where datname = $1", [dbName]);
if (!db.rowCount) await client.query(`create database "${dbName}" owner "${appUser}"`);
await client.end();

console.log(`PostgreSQL ready on port ${port}: database "${dbName}" owned by "${appUser}". Ctrl+C to stop.`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
