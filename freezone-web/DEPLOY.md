# Hosting / production checklist

## 1. Database (PostgreSQL)

1. Create a Postgres database (e.g. [Neon](https://neon.tech), Supabase, or a VPS with Docker).
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Push schema and seed demo data:

```bash
npx prisma db push
npx prisma db seed
```

## 2. Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for SEO (`https://your-domain.com`) |
| `ADMIN_PASSWORD` | Optional direct-login password for CI / unattended jobs (`POST /api/admin/login`). The interactive dashboard uses email + password against `AdminUser` instead. |
| `ADMIN_SESSION_SECRET` | HMAC secret for the legacy `fz_admin_session` cookie (kept for the `/api/admin/*` API surface that the new dashboard still consumes). |
| `DASHBOARD_SEED_EMAIL` / `DASHBOARD_SEED_NAME` / `DASHBOARD_SEED_PASSWORD` | First-superadmin credentials seeded by `prisma/seed-dashboard-superadmin.ts`. |

## 3. Build & run

```bash
npm install
npm run build
npm start
```

## 4. File uploads

Dashboard media uploads (logos, product images, hero slides) write to `public/uploads/`. On read-only or serverless hosts, use external storage or a writable volume.

## 5. Storefront data

- With `DATABASE_URL`, products and categories load from the database (`src/lib/catalog.ts`). Without it, the site falls back to `src/lib/data.ts`.
- Homepage CMS (ticker, hero, trust bar, spotlight strip) is loaded from the database when configured (`src/lib/layout-cms.ts`); otherwise static defaults apply.

## 6. Dashboard (`/dashboard`)

1. Set `ADMIN_SESSION_SECRET` and (optionally) `ADMIN_PASSWORD` in `.env`. The dashboard signs in via `AdminUser` rows in Postgres; the password env is only used by `POST /api/admin/login` for unattended automation (e.g. nightly imports).
2. From `freezone-api/`, seed the first super-admin: `npx tsx prisma/seed-dashboard-superadmin.ts` (override credentials with `DASHBOARD_SEED_EMAIL` / `DASHBOARD_SEED_PASSWORD` env vars).
3. Open `/dashboard/login`. Available sections: Overview, Products, Categories, Brands, Orders, Coupons, Media library, Site settings, Design (theme tokens), Users / roles, Profile, Audit log.
4. The legacy `/admin` UI has been removed; any visit to `/admin` or `/admin/*` redirects to `/dashboard/login`.
5. Uploads are stored under `public/uploads/` (ensure the folder is writable on your host).

## 7. SEO

- Per-locale metadata from `SiteConfig` when DB is used.
- `src/app/sitemap.ts`, `src/app/robots.ts`, and JSON-LD in `src/components/seo/StoreJsonLd.tsx`.
- Edit keywords and descriptions in the database (`SiteConfig.seoKeywords`, `metaDescriptionEn/Ar`) after first deploy.
