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
| `ADMIN_PASSWORD` | Admin login (`/admin/login`) |
| `ADMIN_SESSION_SECRET` | Signs admin session cookie |

## 3. Build & run

```bash
npm install
npm run build
npm start
```

## 4. File uploads

Admin logo upload writes to `public/uploads/`. On read-only or serverless hosts, use external storage or a writable volume.

## 5. Storefront data

- With `DATABASE_URL`, products and categories load from the database (`src/lib/catalog.ts`). Without it, the site falls back to `src/lib/data.ts`.
- Homepage CMS (ticker, hero, trust bar, spotlight strip) is loaded from the database when configured (`src/lib/layout-cms.ts`); otherwise static defaults apply.

## 6. Admin CMS (`/admin`)

1. Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` in `.env`.
2. After `npx prisma db push` and `npx prisma db seed`, open `/admin/login`, then `/admin/cms` for homepage CMS (ticker, top bar, logo upload, trust bar, spotlight icons, hero JSON, nav JSON) with live preview. `/admin/products` adds products per category with multiple image URLs and optional `model3d` (glTF/GLB URL).
3. Uploads are stored under `public/uploads/` (ensure the folder is writable on your host).

## 7. SEO

- Per-locale metadata from `SiteConfig` when DB is used.
- `src/app/sitemap.ts`, `src/app/robots.ts`, and JSON-LD in `src/components/seo/StoreJsonLd.tsx`.
- Edit keywords and descriptions in the database (`SiteConfig.seoKeywords`, `metaDescriptionEn/Ar`) after first deploy.
