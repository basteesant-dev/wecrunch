# WeCrunch — franchise website and CMS

The WeCrunch public website (state selection, state-specific landing pages, franchise enquiry forms) and its content management system. It is an independent application with its **own PostgreSQL database** (`WECRUNCH_DATABASE_URL`). It shares no database, session or secret with the WeChai site.

Stack: Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS 4, PostgreSQL 17 with Prisma 7, Zod, TipTap, Vitest and Playwright.

## Quick start (local development)

Requires Node.js 22.12 or later (24 recommended). No Docker or system PostgreSQL is needed: `db:start` runs PostgreSQL 17 from the `embedded-postgres` package.

```bash
npm install
cp .env.example .env          # then set APP_SECRET, CRON_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:start              # keep running in its own terminal (port 5434, role wecrunch_app)
npm run db:deploy             # apply migrations
npm run db:seed               # reference content + first super admin from ADMIN_EMAIL/ADMIN_PASSWORD
npm run dev                   # http://localhost:3000  ·  CMS: /admin  (running both brands? use `npm run dev -- -p 3001`)
```

> **Windows note:** if the project folder contains an `&` (for example `Dev & Mel Hospitality`), npm's `.cmd` shims break. Every script here calls `node <tool>` directly, so always use `npm run …` rather than `npx`.

Seed images are in `prisma/seed-assets/`. They come from the brand's current website and were downloaded with `node ../../tools/fetch-reference-assets.mjs`. The videos are git-ignored, and the seed skips any file that is missing.

## Scripts

| Script | What it does |
| --- | --- |
| `dev`, `build`, `start` | Next.js development server, production build, production server |
| `lint`, `typecheck` | ESLint and `tsc --noEmit` |
| `db:start` | Local embedded PostgreSQL (development only) |
| `db:migrate` | Create a new migration after editing `prisma/schema.prisma` (development) |
| `db:deploy` | Apply pending migrations (CI and production) |
| `db:status` | Show migration status |
| `db:seed` | Seed an empty database. `-- --force` wipes CMS content (keeps users, enquiries, audit log) and reseeds |
| `admin:create` | Create or reset a super admin from `ADMIN_EMAIL` and `ADMIN_PASSWORD` |
| `test` | Unit tests, plus integration tests against a throwaway PostgreSQL. Fails if the schema has changes no migration captures |
| `test:e2e` | Throwaway PostgreSQL, then migrate, seed and production build, then Playwright (desktop and mobile) |

## How content works

```
State (e.g. Kerala) ──landing page──▶ Page "north" ──▶ PageSection[] (draft)
                                               └──publish──▶ PageRevision (immutable snapshot, live)
```

- **Pages** are lists of typed **sections** (hero, features, story, statistics, franchise facts, investment, menu, gallery, testimonials, videos, FAQs, rich text, call to action, enquiry form, contact, state selector). Each section type is declared once in `src/lib/sections/registry.ts`. That declaration drives both the admin editor and the server-side validation. Adding a section type needs no new database table.
- **Editing changes the draft only.** Publishing validates every section and stores an immutable snapshot (`PageRevision`). Visitors only ever see the published snapshot. You can schedule publication, and roll back by publishing an earlier version again.
- **States** decide what each state URL shows. `/kerala` renders the state's landing page (the "North" page) with Kerala as context: the enquiry form preselects Kerala, and Kerala's phone, WhatsApp and email overrides apply. A state can also be *Enquiry only*, *Coming soon*, *Unavailable* or *Draft* (404). New states need no code changes.
- **Content resolution rule:** state override → brand-wide content → default. A section limited to particular states shows only to visitors from those states. Give a brand-wide section and a state-specific section the same **override key**, and visitors from that state see the state version in its place. Contact details resolve as state → page → site settings.
- **Shared content** (menus, galleries, testimonials, FAQs, franchise models, forms) is edited once and referenced by sections. These edits go live immediately, without republishing pages.
- **Caching:** public pages are fully static (`ensureStatic = "navigation"`) and cached under one `cms` tag. Every CMS write expires that tag, so the next visitor gets fresh content. Unknown URLs return a real 404 status. Redirects managed in the CMS are applied by `src/proxy.ts`.

## CMS

`/admin`. Roles:

| Role | Can do |
| --- | --- |
| Super Admin | Everything, including users, site settings and the audit log |
| Content Editor | Pages, sections, states, menus, galleries, testimonials, FAQs, franchise models, forms, media, navigation, SEO |
| Enquiry Manager | View, update, annotate and export franchise enquiries |

Common tasks:

- **Add a state:** States & cities → New state. Set the slug (the URL), status and landing page, plus optional phone, WhatsApp or email overrides and an availability message.
- **Change pricing:** Franchise models → edit the model. Every page that uses it updates.
- **State-specific hero:** open the page, duplicate the hero, set "Show this section only to visitors from" to the state, and use the same override key as the original hero.
- **Publish:** Pages → page → Publish now, or set a date to schedule it. Version history → *Roll back to this* restores an earlier version.
- **Leads:** Franchise enquiries → filter, open, set the status, owner and follow-up date, add notes, and export a CSV of the current filter.

Every sign-in, content change, publication, export and enquiry view is written to the audit log.

## Testing

```bash
npm test            # 41 unit + integration tests
npm run test:e2e    # 23 Playwright tests (desktop + mobile) against a production build
```

## Security summary

- scrypt password hashing. Sessions are random tokens in HTTP-only, SameSite=Lax cookies (Secure in production), stored hashed in the database, and expire after 12 hours.
- Login is rate limited per IP and email, and accounts lock after 10 failed attempts.
- Authorisation is checked server-side on every admin page, server action and API route, not only in the layout. Server actions get Next.js's built-in origin checks, and state-changing route handlers check the `Origin` header.
- All input is validated with Zod on the server. Rich text is sanitised on save and again on publish. Links reject `javascript:` and `data:` schemes. CSV exports neutralise spreadsheet formulas.
- Uploads are type-sniffed (no SVG). Images are re-encoded to WebP with EXIF and GPS removed. Local media serving blocks path traversal.
- Enquiry spam protection: honeypot field, per-IP rate limit, duplicate suppression, and optional Cloudflare Turnstile. Visitor IPs are stored only as keyed hashes.
- Security headers: CSP, HSTS (production), `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and `noindex` on `/admin`.

Deployment, backups and operations are covered in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
