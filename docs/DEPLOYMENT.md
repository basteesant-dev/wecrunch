# WeCrunch — deployment and operations

WeCrunch deploys on its own, separately from WeCrunch. Its database, credentials, media store, admin sessions and secrets are its own. Nothing here is shared with the other brand.

## 1. Infrastructure

WeCrunch runs on **Vercel + Neon (Vercel Marketplace) + Vercel Blob**:

| Concern | Choice |
| --- | --- |
| App | Vercel (Next.js, Node.js runtime). Functions run in **Singapore (`sin1`)**, next to the database (`vercel.json`) |
| Database | Neon PostgreSQL created from the Vercel project (**Storage → Neon**), region **Singapore (aws-ap-southeast-1)**. WeCrunch-only; WeCrunch gets its own |
| Connection | Site: `DATABASE_URL` (pooled). Migrations: `DATABASE_URL_UNPOOLED` (direct). Both are added by the integration. `DB_POOL_MAX=5` |
| Media | Vercel Blob, a **public** store connected to the project, with `STORAGE_DRIVER=blob` |
| Email | Any SMTP service (Amazon SES, Postmark, Zoho, Google Workspace) |
| Scheduler | `/api/cron` once a day at 00:00 UTC (05:30 IST), configured in `vercel.json` |
| Monitoring | Uptime check on `/api/health`, Vercel logs, alerts on 5xx |

Elsewhere (local development, CI, Docker) set `WECRUNCH_DATABASE_URL` (and optionally `WECRUNCH_MIGRATE_DATABASE_URL`) instead; when set, it takes precedence over the Neon variables.

> **Local disk storage is for development only.** With `STORAGE_DRIVER=local`, uploads are written under `LOCAL_UPLOAD_DIR` and served by `/media/...`. That only survives deploys if the directory is a persistent volume.

> **Caching across instances:** public pages are cached by Next.js and invalidated on every CMS change. On Vercel this is shared across instances automatically. When self-hosting, run **one** app instance, or configure a shared `cacheHandlers` (Redis) as described in the Next.js self-hosting guide. Otherwise other instances may serve stale pages until their cache expires (at most 1 hour).

## 2. Environment variables

Copy `.env.example`. Every variable is documented there. On Vercel:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Added by the Neon integration (with other `PG*`/`POSTGRES_*` variables the app ignores) |
| `DB_POOL_MAX` | `5` |
| `SITE_URL` | Canonical origin, e.g. `https://wecrunchfranchise.com` |
| `APP_SECRET` | 32+ random bytes, used to hash visitor IPs |
| `CRON_SECRET` | Bearer token for `/api/cron` |
| `STORAGE_DRIVER=blob` + `BLOB_READ_WRITE_TOKEN` | Media storage. Vercel sets the token when the Blob store is connected; `BLOB_PREFIX` defaults to `wecrunch/` |
| `MAX_VIDEO_MB` | `4`, so oversized CMS uploads get a clear message (Vercel accepts request bodies up to 4.5 MB) |
| `SMTP_*` | Optional. Enquiries are always saved; email notification is added on top |
| `TURNSTILE_SECRET_KEY`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional spam protection |

Keep secrets in the platform's secret store. They are never committed (`.env*` is git-ignored except `.env.example`).

Generate each secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

## 3. Database setup

### Neon (Vercel Marketplace)

1. In the Vercel project: **Storage → Create Database → Neon**, region **Singapore**, and connect it to the project (Production, Preview and Development).
2. For production, use a paid Neon plan and turn off scale-to-zero, or the first request after ~5 idle minutes waits about a second while the database wakes.
3. Copy `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into your local `.env` (or `vercel env pull .env`) to run migrations and the seed from your machine.

Neon connection strings include `sslmode=require` and use publicly trusted certificates, so connections are encrypted and verified with no extra setup.

### Least-privilege role (other PostgreSQL servers)

Run once, as the database owner or admin. **WeCrunch and WeCrunch must not share a role.**

```sql
CREATE ROLE wecrunch_app LOGIN PASSWORD '<strong-password>';
CREATE DATABASE wecrunch OWNER wecrunch_app;
REVOKE ALL ON DATABASE wecrunch FROM PUBLIC;
-- Optional, if the WeCrunch database is on the same server:
REVOKE ALL ON DATABASE wecrunch FROM wecrunch_app;
```

The app role owns its database so `prisma migrate deploy` can apply migrations.

## 4. First deployment (Vercel)

1. Push the repository to GitHub and **import** it in Vercel (framework: Next.js).
2. **Storage → Create → Neon** (see above) and **Storage → Create → Blob** with **public** access, both connected to the project.
3. **Settings → Environment Variables** (Production and Preview): `DB_POOL_MAX=5`, `SITE_URL`, `APP_SECRET`, `CRON_SECRET`, `STORAGE_DRIVER=blob`, `MAX_VIDEO_MB=4`, and `SMTP_*` / Turnstile keys if used.
4. Nothing to set for build, region or cron: `vercel.json` applies migrations before each build, runs functions in Singapore (`sin1`) and calls `/api/cron` once a day (the Hobby plan allows at most one run per day). Scheduled page versions therefore go live at the next daily run, not at their exact time; on the **Pro** plan change the schedule to `*/5 * * * *` to publish within 5 minutes.
5. **Seed once, from your machine**, so images go to Blob. With the Neon URLs, `STORAGE_DRIVER=blob` and `BLOB_READ_WRITE_TOKEN` in `.env`:
   ```bash
   npm run db:deploy                                   # apply migrations
   ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed  # once, on an empty database
   ```
6. **Deploy**. The build prerenders public pages from the database. Vercel sends `Authorization: Bearer $CRON_SECRET` to the cron route automatically when `CRON_SECRET` is set.

Remove `ADMIN_PASSWORD` after the first admin exists, and change that password in the CMS. Images and videos uploaded through the CMS must be under 4.5 MB on Vercel; compress large videos first.

### Docker (any other host)

```bash
docker build --build-arg WECRUNCH_DATABASE_URL=... --build-arg SITE_URL=https://wecrunchfranchise.com -t wecrunch .
docker run -p 3000:3000 --env-file .env.production wecrunch
```

## 5. Domain and HTTPS

- Point `wecrunchfranchise.com` (and `www`) at the platform. Serve HTTPS only; HSTS is sent in production.
- Behind a reverse proxy, forward `Host` and `X-Forwarded-For`. Rate limiting and audit IPs use the **first** `X-Forwarded-For` entry, so only expose the app through a proxy that overwrites that header.
- Set `SITE_URL` to the final https origin. Canonical URLs, Open Graph and `sitemap.xml` use it.
- Old website URLs: add redirects for any that should keep working under CMS → SEO & redirects.

## 6. Releases (CI/CD)

`.github/workflows/ci.yml` runs on every push and PR: lint, type check, unit and integration tests (including a migration drift check), then end-to-end tests against a production build. On `main`, if the repository variable `DEPLOY_ENABLED=true`, the `migrate` job applies migrations using the `WECRUNCH_DATABASE_URL` secret. Connect the platform's Git integration (or add a deploy step) after it.

Release checklist:
1. CI green.
2. Back up the database (see below) if the release contains migrations.
3. `npm run db:deploy`, then deploy the app.
4. Check `/api/health`, the home page, one state page, and a test enquiry. Mark the test enquiry Closed afterwards.

## 7. Rollback

| What | How |
| --- | --- |
| Page content | CMS → Pages → page → Version history → *Roll back to this* |
| App release | Redeploy the previous build (Vercel: *Promote* the previous deployment; Docker: run the previous image tag) |
| Database migration | Migrations are forward-only. Restore the pre-release backup, or write a corrective migration. Avoid destructive migrations in the same release as the code that stops using a column |
| Media | Vercel Blob has no versioning: re-upload the file in the CMS (Media → replace). The CMS refuses to delete media that is still in use |

## 8. Backups and restore

- **Database:** use the provider's automated daily backups with point-in-time recovery (7–30 days). In addition, take a nightly logical dump to separate storage:
  ```bash
  pg_dump --format=custom --no-owner "$WECRUNCH_DATABASE_URL" > wecrunch-$(date +%F).dump
  ```
- **Restore** into a new database, verify it, then switch `WECRUNCH_DATABASE_URL`:
  ```bash
  createdb wecrunch_restore
  pg_restore --no-owner --dbname=postgresql://.../wecrunch_restore wecrunch-2026-10-12.dump
  ```
- **Media:** Vercel Blob has no versioning or point-in-time restore. Keep the original files (`prisma/seed-assets` plus anything uploaded later) in a separate backup.
- Test a restore every quarter.

## 9. Scheduled jobs (`/api/cron`)

Every run:
- publishes scheduled page versions that are due;
- anonymises **Closed** enquiries older than Settings → *Anonymise closed enquiries after (days)* (0 = keep forever);
- deletes expired sessions and old rate-limit rows.

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://wecrunchfranchise.com/api/cron
```

## 10. Monitoring and health

- `GET /api/health` returns `{ ok: true, db: "up" }` (200), or 503 when the database is unreachable. The Docker image uses it as its `HEALTHCHECK`.
- Watch for 5xx rates, enquiry volume (the dashboard shows the last 7 days), and failed sign-ins and lockouts in the audit log.
- Email notification failures are logged (`Enquiry notification failed`); the enquiry itself is already saved.

## 11. Data protection

- Personal data is limited to what the form asks for. Visitor IPs are stored only as keyed hashes.
- Only Super Admins and Enquiry Managers can see or export enquiries. Each view and export is audit-logged.
- Use the retention setting to anonymise closed leads automatically. Delete individual leads on request through a database job if needed (see the Privacy Policy contact).
