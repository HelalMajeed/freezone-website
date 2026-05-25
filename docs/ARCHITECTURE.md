# Architecture — Freezone

## المكدس الإنتاجي (system of record)

| Package | Role |
|---------|------|
| **freezone-api** | Express + Prisma + PostgreSQL — REST، أدمن API، طلبات، CMS |
| **freezone-web** | Vite SPA — متجر + `/admin` (مؤقت حتى اكتمال admin على Next) |
| **freezone-storefront** | Next.js 15 — واجهة عامة SSR/SEO (المرحلة 2، Strangler Fig) |

## Commerce Suite

**مُوقَف** — راجع [ADR-001](adr/001-retire-commerce-suite.md) و [archive/COMMERCE_SUITE_ARCHIVED.md](archive/COMMERCE_SUITE_ARCHIVED.md).

## الإنتاج

- Fly app `freezone-website` + Postgres `freezone-website-pg`
- تفاصيل: [PRODUCTION_DATABASE.md](PRODUCTION_DATABASE.md)

## CI

- `.github/workflows/ci.yml` — freezone-web, freezone-api, freezone-storefront
- `.github/workflows/backup-database.yml` — backup أسبوعي (يتطلب `DATABASE_URL_PROD`)

## خطة التطوير

[FREEZONE_ACTION_PLAN.md](FREEZONE_ACTION_PLAN.md) · [ROADMAP_PROGRESS.md](ROADMAP_PROGRESS.md)
