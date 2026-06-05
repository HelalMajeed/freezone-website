# Freezone monorepo

متجر إلكتروني (e‑commerce) — **Express API** + **Vite** (متجر + لوحة `/dashboard`) + **Next.js storefront** (SEO). خطة التطوير: [`docs/FREEZONE_ACTION_PLAN.md`](docs/FREEZONE_ACTION_PLAN.md).

> **Note:** the official admin panel is now `/dashboard` (login at `/dashboard/login`). The old `/admin` UI has been removed; any request to `/admin` or `/admin/*` redirects to `/dashboard/login`.

[![GitHub repo size](https://img.shields.io/github/repo-size/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website)
[![GitHub last commit](https://img.shields.io/github/last-commit/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website/commits/main)
[![License](https://img.shields.io/github/license/HelalMajeed/freezone-website)](https://github.com/HelalMajeed/freezone-website)

Public repository: [github.com/HelalMajeed/freezone-website](https://github.com/HelalMajeed/freezone-website)

| Area | Packages | Stack | Role |
|------|-----------|--------|------|
| **API** | `freezone-api` | Express + Prisma + PostgreSQL | System of record — إنتاج Fly |
| **Storefront** | `freezone-web` | Vite + React 19 | متجر + لوحة `/dashboard` |
| **Storefront (SEO)** | `freezone-storefront` | Next.js 15 App Router | هجرة تدريجية (المرحلة 2) |

Deep dive: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) · Progress: [`docs/ROADMAP_PROGRESS.md`](docs/ROADMAP_PROGRESS.md)

---

## Prerequisites

- **Node.js 20+** (matches [CI](.github/workflows/ci.yml))
- **PostgreSQL** (local Docker, hosted Neon/Supabase/RDS, or Windows `pg-local-cluster` scripts in `freezone-web`)
- **Docker** (optional but recommended for `npm run db:local` / Compose at repo root)

This repo does **not** use npm `workspaces`; install dependencies in each package directory you use (see below).

---

## Repository layout

```
freezone-api/           # Express API, Prisma, migrations
freezone-web/           # Vite SPA: storefront + /dashboard panel
freezone-storefront/    # Next.js 15 (SSR) — Phase 2
docs/                   # Action plan, ADRs, production DB, DR
docker-compose.yml
.github/workflows/
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

```bash
npm install --prefix freezone-storefront
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

**Next.js storefront** (port 3100):

```bash
npm run dev:storefront
```

---

## Root npm scripts (cheat sheet)

| Script | Purpose |
|--------|---------|
| `dev` | `predev` then API + web concurrently |
| `dev:api` / `dev:web` | Single package dev |
| `dev:storefront` | Next.js storefront |
| `db:local` | `db:up` (web prefix) + `db:setup` (API: generate, migrate deploy, seed) |
| `db:up` / `db:down` | Docker Postgres via `freezone-web` |
| `db:migrate` / `db:seed` / `db:push` / `db:status` | Prisma via `freezone-api` |
| `build` / `build:api` / `build:web` | Production builds |
| `start:api` / `start:web` | Run built API / Vite preview |
| `docker:build` / `docker:up` / `docker:down` / `docker:logs` | Root Compose stack |
| `ci:freezone` | Lint + tests + builds (web + api + storefront) |
| `ci` | Same as `ci:freezone` |

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

- **From monorepo root** (recommended): root [`fly.toml`](fly.toml) builds `freezone-api/Dockerfile` with `SERVICE_PATH=freezone-api`. Run: `flyctl deploy -a freezone-website`
- **From `freezone-api/`**: [`freezone-api/fly.toml`](freezone-api/fly.toml) with Docker context = that folder. Run: `flyctl deploy -a freezone-website`
- Install CLI (Windows): `winget install Fly-io.flyctl -e --accept-source-agreements --accept-package-agreements`
- Log in: `flyctl auth login` (or set `FLY_API_TOKEN` for non-interactive use).
- One-shot deploy + secrets + SSH migrate: run [`freezone-api/scripts/fly-deploy.ps1`](freezone-api/scripts/fly-deploy.ps1) (Windows) or [`freezone-api/scripts/fly-deploy.sh`](freezone-api/scripts/fly-deploy.sh) (macOS/Linux). Optional: `$env:DATABASE_URL = 'postgresql://...'` before the script to push/update the Fly secret.
- After login, health: `flyctl status -a freezone-website` and open `https://freezone-website.fly.dev/health` (replace with your app name if different).
- **Production data lives in whatever Postgres `DATABASE_URL` points to.** Fly secret `DATABASE_URL` (see `flyctl secrets list -a freezone-website`) must match the database where you created products (often local Docker volume `freezone_pg`, a Neon/Supabase project, or a Fly Postgres app such as `freezone-website-pg`). If the live API shows empty or tiny catalogs, the app is usually connected to a **new empty cluster** or the wrong host — fix by setting `DATABASE_URL` to the real database URI, then `flyctl deploy` / restart (no seed required). Read-only counts on the API machine: `npm run db:counts --prefix freezone-api` locally with your `.env`, or after deploy run `flyctl ssh console -a freezone-website -C "sh -lc 'cd /app && node scripts/print-db-counts.mjs'"` (use PowerShell `--%` before `flyctl` if `-C` is mangled). For migration from local to Fly Postgres, take a **`pg_dump` backup** first, then `pg_restore` / `psql` — never `migrate reset` on production.

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

1. **freezone-web** — `npm ci`, `lint`, `test`, `build`
2. **freezone-api** — `npm ci`, `build`
3. **freezone-storefront** — `npm ci`, `build`

Node version: **20**.

---

## Tech stack reference

| Package | Runtime / UI | Data |
|---------|----------------|------|
| `freezone-api` | Express, `tsx` dev, esbuild bundle for `start` | Prisma 6 → PostgreSQL |
| `freezone-web` | Vite 7, React 19, React Router 7 | Fetches API |
| `freezone-storefront` | Next.js 15, React 19 | SSR catalog via API |

---

## License / contributing

Add project-specific license and contribution guidelines when you publish the repo; this README focuses on setup and architecture navigation.
