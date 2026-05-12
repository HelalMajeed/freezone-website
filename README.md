# Freezone monorepo

متجر إلكتروني (e‑commerce) يضم واجهة متجر، REST API، ولوحة إدارة مدمجة، مع مسار **Commerce Suite** اختياري لتجارب كتالوج/إدارة منفصلة.

[![GitHub repo size](https://img.shields.io/github/repo-size/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website)
[![GitHub last commit](https://img.shields.io/github/last-commit/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website/commits/main)
[![License](https://img.shields.io/github/license/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website)

Public repository: [github.com/HelalMajeed/freezone-website](https://github.com/HelalMajeed/freezone-website)

| Area | Packages | Stack | Role |
|------|-----------|--------|------|
| **Primary (Freezone)** | `freezone-api`, `freezone-web` | Express + Prisma + PostgreSQL · Vite 7 + React 19 + React Router | Storefront, CMS/admin SPA, orders; API is system of record for production data |
| **Optional (Commerce Suite)** | `commerce-suite/admin-api`, `commerce-suite/admin-web` | NestJS + Prisma · Next.js 15 App Router | Greenfield catalog (`CatalogCategory`, …), RBAC scaffold; separate DB/schema until cut‑over |

Deep dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Web app notes: [`freezone-web/README.md`](freezone-web/README.md) · Commerce: [`commerce-suite/README.md`](commerce-suite/README.md)

---

## Prerequisites

- **Node.js 20+** (matches [CI](.github/workflows/ci.yml))
- **PostgreSQL** (local Docker, hosted Neon/Supabase/RDS, or Windows `pg-local-cluster` scripts in `freezone-web`)
- **Docker** (optional but recommended for `npm run db:local` / Compose at repo root)

This repo does **not** use npm `workspaces`; install dependencies in each package directory you use (see below).

---

## Repository layout

```
freezone-api/          # Express API, Prisma schema, migrations, seed
freezone-web/          # Vite SPA: storefront + /admin, proxies /api in dev
commerce-suite/
  admin-api/           # NestJS catalog API (port 3020)
  admin-web/           # Next.js admin UI (port 3010)
docs/ARCHITECTURE.md   # Freezone vs Commerce Suite decisions
scripts/ci-commerce.cjs # Local CI helper for commerce builds
docker-compose.yml     # postgres + api + web (production-style images)
.github/workflows/ci.yml
```

**Freezone domain (Prisma)** includes among others: brands, categories (facets, hero images), products (specs JSON, 3D model, variants scaffold), orders, CMS/admin uploads, i18n-friendly fields (`nameEn` / `nameAr`, etc.). See `freezone-api/prisma/schema.prisma`.

---

## Install dependencies

From the repository root:

```bash
npm install
npm install --prefix freezone-api
npm install --prefix freezone-web
```

For Commerce Suite locally:

```bash
npm install --prefix commerce-suite/admin-api
npm install --prefix commerce-suite/admin-web
```

---

## Quick start (Freezone — recommended path)

1. **Environment**

   - Copy `freezone-api/.env.example` → `freezone-api/.env`
   - Copy `freezone-web/.env.example` → `freezone-web/.env`
   - Keep **`DATABASE_URL` identical** in both files (see comments in the examples for ports `5432` vs `5433`, SSL, etc.).

2. **Database** (Postgres + migrate + seed):

   ```bash
   npm run db:local
   ```

   - Starts Docker Postgres when Docker is available (`freezone-web` compose); otherwise expects Postgres at `DATABASE_URL`.
   - **Windows**: see `freezone-web/.env.example` for `db:local:win`, `pg:cluster:*`, and firewall/LAN scripts.

3. **Dev servers** (API + Vite; root `predev` initializes env, DB checks, Prisma migrate):

   ```bash
   npm run dev
   ```

| Service | Default URL / port | Notes |
|---------|-------------------|--------|
| Storefront + admin SPA | `http://localhost:3000` | Override with `VITE_DEV_PORT` |
| API | `http://localhost:4000` | `API_PORT`; health: `GET /health` |
| API from web (dev) | Proxied `/api`, `/uploads` | See `freezone-web/vite.config.ts` |

**Run API or web alone** (after DB + env are ready):

```bash
npm run dev:api
npm run dev:web
```

**Commerce Suite** (separate Postgres DB recommended — own Prisma schema):

```bash
npm run dev:commerce:api
npm run dev:commerce:web
```

Follow [`commerce-suite/README.md`](commerce-suite/README.md) for `.env` / `.env.local` and first migration.

---

## Root npm scripts (cheat sheet)

| Script | Purpose |
|--------|---------|
| `dev` | `predev` then API + web concurrently |
| `dev:api` / `dev:web` | Single package dev |
| `dev:commerce:api` / `dev:commerce:web` | Commerce Suite |
| `db:local` | `db:up` (web prefix) + `db:setup` (API: generate, migrate deploy, seed) |
| `db:up` / `db:down` | Docker Postgres via `freezone-web` |
| `db:migrate` / `db:seed` / `db:push` / `db:status` | Prisma via `freezone-api` |
| `build` / `build:api` / `build:web` | Production builds |
| `start:api` / `start:web` | Run built API / Vite preview |
| `docker:build` / `docker:up` / `docker:down` / `docker:logs` | Root Compose stack |
| `ci:freezone` | Lint + tests + builds (Freezone only) |
| `ci:commerce` | `scripts/ci-commerce.cjs` — `npm ci` + build both commerce packages |
| `ci` | `ci:freezone` then `ci:commerce` (same shape as full local quality gate) |

---

## Docker (root `docker-compose.yml`)

Services: **postgres** (16-alpine), **api** (`freezone-api` Dockerfile), **web** (`freezone-web` Dockerfile).

```bash
npm run docker:build
npm run docker:up
```

- API health: `GET http://localhost:4000/health` (used by Compose healthchecks).
- Tunables: `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `API_PORT`, `WEB_PORT`, `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET`, admin-related vars on `web` (see `docker-compose.yml`).

---

## Fly.io (`freezone-api`)

- Config: [`freezone-api/fly.toml`](freezone-api/fly.toml) (default app name `freezone-website`; override with `FLY_APP_NAME`).
- Install CLI (Windows): `winget install Fly-io.flyctl -e --accept-source-agreements --accept-package-agreements`
- Log in: `flyctl auth login` (or set `FLY_API_TOKEN` for non-interactive use).
- One-shot deploy + secrets + SSH migrate: run [`freezone-api/scripts/fly-deploy.ps1`](freezone-api/scripts/fly-deploy.ps1) (Windows) or [`freezone-api/scripts/fly-deploy.sh`](freezone-api/scripts/fly-deploy.sh) (macOS/Linux). Optional: `$env:DATABASE_URL = 'postgresql://...'` before the script to push/update the Fly secret.
- After login, health: `flyctl status -a freezone-website` and open `https://freezone-website.fly.dev/health` (replace with your app name if different).

---

## Environment variables (summary)

| Location | Highlights |
|----------|------------|
| `freezone-api/.env.example` | `DATABASE_URL`, `API_PORT`, `NEXT_INTERNAL_ORIGIN`, `REVALIDATE_SECRET`, optional `LOG_HTTP=1` |
| `freezone-web/.env.example` | Same DB URL, `API_INTERNAL_URL`, `NEXT_PUBLIC_SITE_URL`, admin cookie/password flags, dev toggles (`SKIP_*`, `VITE_DEV_PORT`, LAN notes) |

Admin routes share expectations between API and web; keep admin secrets aligned across both `.env` files in production.

---

## Build and quality (local)

**Freezone only:**

```bash
npm run ci:freezone
```

**Full monorepo (lint, Vitest, builds — mirrors CI jobs):**

```bash
npm run ci
```

---

## CI (GitHub Actions)

On every **push** and **pull_request**, parallel jobs run:

1. **freezone-web** — `npm ci`, `lint`, `test` (Vitest), `build`
2. **freezone-api** — `npm ci`, `build`
3. **commerce-admin-api** — `npm ci`, `prisma generate`, `build`
4. **commerce-admin-web** — `npm ci`, `build` with `NEXT_PUBLIC_API_URL=http://127.0.0.1:3020/v1`

Node version: **20**.

---

## Tech stack reference

| Package | Runtime / UI | Data |
|---------|----------------|------|
| `freezone-api` | Express, `tsx` dev, esbuild bundle for `start` | Prisma 6 → PostgreSQL |
| `freezone-web` | Vite 7, React 19, React Router 7, TanStack Query, i18next, Tailwind-related utilities | Prisma in SSR paths + internal fetches to API |
| `commerce-suite/admin-api` | NestJS 11 | Prisma 6 (catalog models) |
| `commerce-suite/admin-web` | Next.js 15, RHF, Zod, TanStack Query/Table, dnd-kit | Calls admin API via `NEXT_PUBLIC_API_URL` |

---

## License / contributing

Add project-specific license and contribution guidelines when you publish the repo; this README focuses on setup and architecture navigation.
