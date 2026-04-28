# Commerce Admin Suite

Production-oriented admin stack (separate from legacy `freezone-web` / `freezone-api`):

| Package | Stack | Port |
|--------|--------|------|
| `admin-api` | NestJS + Prisma + PostgreSQL | `3020` |
| `admin-web` | Next.js App Router + Tailwind + shadcn-style UI + Zustand + RHF/Zod + TanStack Query/Table + dnd-kit | `3010` |

## Prerequisites

- Node 20+
- PostgreSQL (empty database recommended for this suite’s **own** Prisma schema)

## 1. API

```bash
cd commerce-suite/admin-api
cp .env.example .env
# set DATABASE_URL
npm install
npx prisma migrate dev --name init_commerce_catalog
npm run dev
```

## 2. Web

```bash
cd commerce-suite/admin-web
cp .env.local.example .env.local
# NEXT_PUBLIC_API_URL=http://localhost:3020/v1
npm install
npm run dev
```

Open [http://localhost:3010/en/dashboard/categories](http://localhost:3010/en/dashboard/categories).

## Notes

- **Catalog tables** use `CatalogCategory` / `CatalogAttribute` Prisma models so this stack can evolve independently; merge or map to legacy `Category` when you cut over.
- **RBAC** is scaffolded (`RolesGuard`, `@Roles()`); wire JWT + real roles for production.
- Design tokens align with `stitch_apex_commerce_suite` (primary blue `#1f53c9`, surfaces `#f8f9ff`).
