# CLAUDE.md — FreeZone ([freezone-iq.com](https://freezone-iq.com))

Persistent project rules + architecture map. Claude Code reads this file automatically at the
start of EVERY session. Follow it in every task; subagents inherit these rules too.

> **Verify before trusting docs.** This repo has many status `.md` files written at different
> times; several are stale and contradict the code (see §13). When code and a doc disagree,
> **the code wins**, then the newest ground-truth docs (`.claude-state.md`, `RESUME_STATUS.md`).
> This file was rebuilt 2026-06-20 from a full read of the code + workflows.

---

## 1. What this project is

- **FreeZone** — electronics & tech e-commerce store for the **Iraqi market** (with global
  ambitions): CCTV/security, computers & laptops, gaming, networking, smart home, power
  (UPS/solar/inverters), mobiles.
- **Live & shipped.** Public site `https://freezone-iq.com` (Arabic `/ar` is primary, English
  `/en` secondary). Work is **fix-forward on a live store** (~1500 real products) — be careful.
- Currency: **IQD, stored as integer whole dinars** (no decimals, no `Decimal`, no cents).
- Customers identified primarily by **phone** (`07XXXXXXXXX`, 11 digits); email optional.
- Repo: `https://github.com/HelalMajeed/freezone-website` — default/production branch **`main`**.

## 2. Monorepo layout (npm, **NO workspaces** — install per package)

```
FREE ZONE-Repo/
├─ freezone-api/        Backend — Express 4 + Prisma 6 + PostgreSQL. System of record. → Fly.io
├─ freezone-web/        Frontend — Vite 7 + React 19 SPA. Storefront + /admin panel. → Netlify
├─ freezone-storefront/ Next.js 15 — ABANDONED 3-file scaffold (ADR-003). NOT deployed. Ignore.
├─ .github/workflows/   8 GitHub Actions (CI, deploy, backups, imports, ops, lighthouse)
├─ docs/                ADRs, runbooks, checklists (some stale — verify against code)
├─ fly.toml             Fly.io config for the API (app = "freezone-website")
├─ netlify.toml         ⚠️ DEAD CONFIG (ignored by the live deploy). See §11.
├─ docker-compose.yml   Local full stack (postgres + api + web)
└─ package.json         Root orchestrator: `--prefix` scripts only (no workspaces)
```

Each package is installed independently: `npm install --prefix freezone-api`, etc. Root scripts
(`npm run dev`, `npm run ci`) delegate via `--prefix`. Path alias `@` → `src/` in every package.

## 3. Tech stack (verified)

| Area | Choice |
|---|---|
| **Backend** | Node **22** (ESM, `type:module`), **Express 4.21**, **Prisma 6.3** ORM, **PostgreSQL**. Dev = `tsx watch`; build = `esbuild` bundle → `dist/`; prod = `node dist/server.js`. |
| **Validation** | **zod 4** (partial — only ~14/116 routes; rest manual validation). |
| **Auth hashing** | **scrypt** (current) / argon2id available. **NOT bcrypt.** |
| **Sessions** | DB-backed **opaque random tokens** (SHA-256 hash stored). **NOT JWT.** Revocable. |
| **Frontend** | **Vite 7**, **React 19.2**, **react-router-dom 7** (plain `<Routes>`), **TanStack Query 5** (server state), **zustand 5** (client state). |
| **Styling** | **No Tailwind.** CSS custom-property tokens (`src/theme/tokens.css`) + CSS Modules. Brand red `#C90000` is the *accent*; `--color-primary` is black. |
| **i18n** | **i18next + react-i18next**, Arabic default + RTL. Storefront strings in `src/messages/{en,ar}.json`; dashboard strings in `src/lib/dashboard/i18n/{en,ar}.ts`. |
| **Images/3D** | sharp (server), `@google/model-viewer` (3D). Local WebP re-host only — no hotlinking. |
| **Tests** | API: `node --test` via tsx (**hardcoded file list** in package.json). Web: **vitest** (unit) + **Playwright** e2e (not in CI). |
| **Deploy** | API → **Fly.io** (`freezone-website`). Web → **Netlify** (Git integration). DB → Fly app `freezone-website-pg`. |

## 4. Architecture & data flow

```
Browser ──► Netlify (freezone-iq.com)            Vite SPA: storefront + /admin
   │          static dist/ + prerendered shells   _redirects proxies /uploads + /sitemap.xml
   │
   └─ fetch (credentials: include) ──► Fly.io (freezone-website.fly.dev)
                                        Express API + Prisma ──► PostgreSQL (freezone-website-pg)
                                        static /uploads (persistent Fly volume)
```

- The SPA calls the API cross-origin at `VITE_API_URL` (`https://freezone-website.fly.dev`,
  baked at build time). In local dev, requests are same-origin and Vite proxies `/api` +
  `/uploads` → `127.0.0.1:4000`.
- Product/CMS images live on the Fly volume `/uploads`; Netlify **force-proxies** `/uploads/*`
  and `/sitemap.xml` to the API (see `freezone-web/public/_redirects`).
- **SEO for a client-only SPA**: build-time prerender (`freezone-web/scripts/prerender.mjs`,
  `postbuild`) writes per-route static `index.html` shells with meta + JSON-LD; runtime
  `src/components/seo/Seo.tsx` upserts head tags; one Netlify edge function
  (`seo-product-404.ts`) turns unknown-product soft-404s into real 404s (fails open).

### API routing is filesystem-convention (Next.js App-Router ported onto Express)
- Handlers live at `freezone-api/src/app/api/**/route.ts` and export Web-standard
  `GET/POST/PUT/...` functions taking a Web `Request`, returning a Web `Response`.
  `src/server.ts` adapts Express ↔ Web.
- `src/lib/route-registry.ts` auto-discovers and mounts them (`[id]` → `:id`; static segments
  sorted before `:param`). **116 route files.** There is no central router table to grep.
- `npm run routes:check` (`scripts/check-route-parity.mjs`) is a deploy gate that fails if a
  frozen legacy route is missing.
- **Business logic lives in `src/lib/**`** (no `controllers/`/`services/` dirs). Tests are
  co-located `*.test.ts`.

## 5. Modules (what each part does)

**freezone-api/src/**
- `server.ts` — boot, middleware stack, route auto-mount, error handler. Port `API_PORT` (4000).
- `lib/route-registry.ts` — filesystem route discovery/mount.
- `lib/prisma.ts` — Prisma client (injects `connect_timeout`).
- `lib/admin-auth.ts`, `admin-route-guard.ts`, `admin-session.ts`, `dashboard-auth.ts`,
  `dashboard-guard.ts`, `customer-auth.ts`, `admin-secrets.ts`, `internal-actor.ts`,
  `password-hash.ts` — the **three auth realms** (see §7).
- `lib/catalog*.ts` + `ttl-cache.ts` — storefront catalog read path + in-process SWR/TTL cache
  (⚠️ OOM-sensitive, see §12).
- `lib/classification/**` — product attribute/spec system (EAV) + filters.
- `lib/payments/**` — provider registry: `cod`, `store_pickup` (always on); `zaincash`,
  `qicard`, `fib`, `card` (gated by env keys; throw `NotConfiguredError` without keys).
- `lib/rate-limit.ts` + `rate-rules.ts` — in-memory sliding-window limiter (single-machine).
- `lib/admin-audit.ts` — `logAdminAction` → `AuditLog` rows for every admin mutation.
- `lib/import-globaliraq/**` + `scripts/` — catalog scraper/importer (CLI + admin route).
- `lib/observability/index.ts` — lazy Sentry shim.
- `app/api/{public,ssr,admin,dashboard,pc-build}/**/route.ts` — the API surface (see §6).

**freezone-web/src/**
- `main.tsx` / `App.tsx` — providers + top-level routing. `/admin` & `/dashboard` selected by
  **pathname regex** (not route ranking); admin is one lazy chunk.
- `routes/LocaleLayout.tsx` — storefront shell; loads everything via one
  `GET /api/ssr/storefront-bootstrap` call, split into cached `shell` + `catalog` queries.
- `routes/dashboard-routes.tsx` — admin routes under `/admin`, wrapped in `<DashboardGuard>` +
  `<RequireRole>`.
- `lib/api-internal.ts` — storefront fetch helpers (resolves API base, `credentials:include`).
- `lib/dashboard/api.ts` — admin API client (cookie auth, `no-store`, fires
  `fz:dashboard-unauthorized` on 401). Also the frozen admin API type surface.
- `lib/store.ts` / `wishlist-store.ts` / `compare-store.ts` / `storefront-user.ts` /
  `dashboard/auth-store.ts` — zustand stores (cart persisted to localStorage).
- `components/seo/Seo.tsx`, `scripts/prerender.mjs`, `netlify/edge-functions/seo-product-404.ts`
  — the SEO machinery.

## 6. API surface (namespaces under `/api`)

| Namespace | Files | Auth | Purpose |
|---|---|---|---|
| `/api/public/*` | 14 | customer cookie / public | customer auth, orders, order-track, reviews, coupon validate, contact, site, search, **sitemap.xml** |
| `/api/ssr/*` | 9 | public (rate-limited) | storefront read: catalog/product/home/bootstrap/theme |
| `/api/admin/*` | 82 | admin (`guardAdminRead`/`guardAdminMutate`) | full catalog/CMS/orders/customers/reviews/coupons/media/import/settings |
| `/api/dashboard/*` | 10 | dashboard cookie + role | `auth/{login,logout,me,...}`, overview, audit, users |
| `/api/pc-build` | 1 | public | PC builder |
| `/health`, `/` | — | public | health (`{ok:true}`); **note `/health`, not `/api/health`** |
| `/uploads/*` | — | public | `express.static` of the Fly volume |

- Success shape `{ ok: true, ... }`; error `{ ok:false, error:"CODE", ... }`. ⚠️ Envelope is
  **inconsistent**: dashboard routes + `GET /api/admin/orders` wrap in `{ ok, data:{...} }`.
- `API_CONTRACT.md` exists but is **partially stale** — verify against route files.
- **No WebSockets / SSE** anywhere; notifications are polled REST.
- Pagination: `?page` (≥1) `&pageSize` (clamped), response includes `total`.
- Rate limits (`lib/rate-rules.ts`): logins/register/checkout/contact/reviews 5–10 per window;
  public GET fallback 300/min/IP.

## 7. Auth & authorization (the real model)

**Two independent realms, both DB-backed opaque-token sessions (NOT JWT). scrypt (NOT bcrypt).**

| Cookie | Realm | TTL | Notes |
|---|---|---|---|
| `fz_customer_session` | storefront customer | 30 d | phone-keyed; no roles (signed-in vs guest) |
| `fz_dashboard_session` | admin/operator (**source of truth**) | 7 d | role-gated; DB-backed `AdminSession` |
| `fz_admin_session` | legacy HMAC | 7 d | only honored if `LEGACY_ADMIN_COOKIE=true`; read-only for mutations |

- All cookies: `HttpOnly` always; `Secure` when prod **or** `SameSite=None`; SameSite from
  `*_COOKIE_SAMESITE` env (cross-origin Netlify↔Fly needs **`none`**).
- **Roles** (Prisma enum `AdminRole`): `SUPER_ADMIN(2) > CATALOG_MANAGER(1) > CATALOG_EDITOR(0)`.
  ⚠️ `src/lib/rbac.ts` is a **different, UNUSED** scaffold — do not edit it expecting effect.
- Guards are called **inside each route handler** (no global auth middleware):
  `guardDashboard(req, minRole)`, `requireAdminRead`, `requireAdminRole(req, roles)`. Any new
  admin route **must call a guard itself.**
- Brute-force: 5 failed logins → 15-min lock (`failedLogins`/`lockedUntil`). Auth events are
  audited (never the password).
- Boot guard `assertAdminSecretsConfigured()` **throws in production** if `ADMIN_SESSION_SECRET`
  < 32 chars, or `ADMIN_REQUIRE_PASSWORD!=true` / `ADMIN_PASSWORD` < 12, or secret == password.
- `direct-login` (passwordless) and `dev-login` **fail closed in production** (403 / 404).
- `/admin` route protection in the SPA is **client-side only** — the **API is the real boundary.**

## 8. Data models (Prisma — 34 models, 3 enums, ~33 migrations)

- Provider **PostgreSQL**; `DATABASE_URL` must be **byte-identical** in `freezone-api` and
  `freezone-web` `.env`. Migration naming `YYYYMMDDHHMMSS_snake_case`.
- **Enums**: `AdminRole`; `ProductCatalogStatus` (DRAFT…PUBLISHED…ARCHIVED — data-entry
  workflow); `ProductAvailability`. Many status fields (`Order.status`, `paymentStatus`,
  `StockMovement.reason`, …) are plain **String** validated only in app code.
- **Catalog**: `Brand`, `Category` (self-referential tree), `CategoryAttribute` (source of truth
  for filters/specs), `Product` (the hub — ~50 fields, 8+ child relations),
  `ProductImage`, `ProductVariant` (scaffold, not in checkout), `ProductAttributeValue` (EAV),
  `ProductSecondaryCategory`, `ProductComment` (internal staff thread).
- **Commerce**: `Order` (+ snapshot fields, guest = `customerId` null), `OrderLineItem`
  (immutable snapshot), `OrderStatusEvent` (append-only timeline), `Coupon`,
  `StockMovement` (append-only inventory ledger).
- **Identity**: `AdminUser`+`AdminSession` (dashboard); `Customer`+`CustomerSession`
  (storefront, phone unique, **email NOT unique**); `Review` (public, moderated).
- **CMS/content**: `SiteConfig` (single row id=1), `HeroSlide`, `TickerItem`, `TrustBarItem`,
  `HomeSpotlightItem`, `SocialLink`, `ShowroomMedia`, `PromoBanner`, `MediaAsset`, `CmsPage`,
  `CmsPageSection` (draft/publish payloads).
- **Ops**: `ProgressState`, `ImportBatch`, `AuditLog`, `Notification`.
- **Money** = `Int` IQD everywhere (`price`, `priceUsd`, `oldPrice`, fees…). **No floats/cents.**
- **Soft-delete** only on `Product` (`deletedAt` — storefront queries must filter it).
  Most other FKs use `onDelete: SetNull` to preserve ledger/audit rows.
- **EAV ↔ JSON dual-write**: `ProductAttributeValue` synced to `Product.specs`;
  `CategoryAttribute` synced to `Category.facetKeys`. Edit via the sync helper or filters desync.

## 9. Conventions (golden rules — never violate)

1. **Inspect before changing.** Read the relevant files first. Never assume a file, model,
   route, or script exists. Routing/auth/cache are implicit and order-sensitive here.
2. **Minimal diffs.** No refactors/renames/"cleanup" of working code unless the task asks.
   (`.cursor/rules/freezone-strict-cleanup.mdc` forbids drive-by refactors and deletes.)
3. **Build gates before every commit:** affected package `npm run build` passes (web =
   `tsc -b && vite build`; api = `tsc --noEmit` + esbuild), `npm run lint` (web) clean,
   API `npm run routes:check` + `npm test` green. No new TS/lint errors.
4. **Never commit secrets.** All credentials via env. **Agents cannot edit `.env*`** (permission
   policy) — document new env vars in `docs/ENV_VARS_GLOBAL_LAUNCH.md` for the owner.
5. **No fake integrations.** Payment adapters (ZainCash/QiCard/FIB/card) are real and gated by
   env keys → `NotConfiguredError`/"coming soon" without keys. Never simulate success. COD +
   store-pickup are always on.
6. **Destructive ops** (drop tables, delete/edit applied migrations, `db push`, force-push, mass
   delete, prod DB reset/TRUNCATE/DELETE) require **explicit owner confirmation**.
7. **DB:** `prisma migrate dev --name <x>` only — never `db push` on this project, never edit
   applied migrations. Prisma Client only (parameterized `$queryRaw` if raw is unavoidable).
   Stock changes inside `prisma.$transaction` with a `StockMovement` ledger row. New models get
   `createdAt @default(now())`.
8. **i18n:** every user-facing string via i18n in **both** `ar` (default/RTL) and `en` in the
   same commit. No hardcoded UI text. Code/comments/commits/docs in **English**; reply to the
   developer in **Arabic** when he writes Arabic.
9. **SEO standing requirement:** any new public page ships with prerender entry + sitemap entry +
   bilingual content + trailing-slash canonical (keep `prerender.mjs`, `Seo.tsx`, and the API
   `sitemap.xml` route in sync). `/admin` + `/api` stay noindex / robots-disallowed.
10. **Frontend:** mobile-first, RTL-aware, red `#C90000` accent. Lazy-load heavy routes; lazy
    images with width/height; loading/error/empty states on every page; cart persists to
    localStorage; guest checkout always allowed.
11. When info is missing, make a reasonable production-grade assumption, log it in
    `ASSUMPTIONS.md`, and continue — don't stall, don't invent project facts.

## 10. Commands

```bash
# Local dev (root) — starts postgres + api + web together
npm run dev                 # predev seeds env + ensures DB + migrate, then api+web concurrently
npm run dev:api             # API only (freezone-api, tsx watch, :4000)
npm run dev:web             # web only (freezone-web Vite, :3000)

# DB (delegate to freezone-api)
npm run db:local            # docker postgres up + migrate + seed
npm run db:migrate          # prisma migrate dev
npm run db:seed             # ⚠️ DESTRUCTIVE reseed (prod-guarded; seeds 0 products)

# Build gates
npm run build               # api + web
npm run ci                  # full gate: web lint+test+build, api routes:check+test+build, storefront build

# Per package
npm run lint  --prefix freezone-web
npm run test  --prefix freezone-web      # vitest
npm run routes:check --prefix freezone-api
npm run test  --prefix freezone-api      # node --test (hardcoded file list!)

# Docker full stack
npm run docker:up / docker:down / docker:logs
```

Verify these on first run (root `package.json` is the source of truth) and correct here if drifted.

---

## 11. Deployment Workflow  ⭐

**Production branch = `main`.** Two **independent** auto-deploy mechanisms both watch `main`:

### A) Web SPA (storefront **+** `/admin` panel) → Netlify → `https://freezone-iq.com`
- **Mechanism (LIVE): Netlify's own Git integration.** Netlify is connected to the GitHub repo
  and **rebuilds `main` on every push** (`npm run build` with `postbuild` prerender, base
  `freezone-web`, publish `dist`).
- The storefront and the admin dashboard are the **same Vite bundle** → **one Netlify deploy
  updates both** the public site and the admin panel.
- ⚠️ The `deploy-web` job in `deploy-production.yml` (`nwtgck/actions-netlify`) is a **harmless
  no-op**: the GitHub secrets `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` **are not set**, so it logs
  *"Netlify credentials not provided, not deployable"* and goes green without deploying.
  (Evidence: `SHIP_STATUS.md`, `RESUME_STATUS.md`. If those secrets are ever added, the Action
  becomes a *second* publish path and could race the Git build.)
- **Authoritative Netlify config = `freezone-web/public/_redirects` + `freezone-web/public/_headers`**
  (shipped inside the publish dir). They force-proxy `/uploads/*` and `/sitemap.xml` to the Fly
  API, set security headers, and `noindex` `/admin`. **Root `netlify.toml` is DEAD CONFIG** —
  edit the `public/_redirects` / `_headers` files, never the root toml.

### B) API (+ DB migrate) → Fly.io app `freezone-website` → `https://freezone-website.fly.dev`
- **Mechanism: GitHub Actions `.github/workflows/deploy-production.yml`** (secret `FLY_API_TOKEN`
  is present and this path works).
- **Trigger:** push to `main` touching `freezone-api/**`, `freezone-web/**`, `fly.toml`,
  `freezone-api/Dockerfile`, or `deploy-production.yml`; **or** manual `workflow_dispatch`.
- **Pipeline:** `verify-api` (routes:check + test + build) **and** `verify-web` (lint + test +
  build) gate → `deploy-api` (`flyctl deploy -a freezone-website --remote-only`) →
  `deploy-web` (the no-op Netlify job).
- **DB migrations run on container boot** via `freezone-api/docker-entrypoint.sh`
  (`npx prisma migrate deploy`) — **not** a Fly `release_command` (commented out). A bad/missing
  `DATABASE_URL` or migration fails the machine boot.
- Postgres is a **separate** Fly app `freezone-website-pg`; daily volume snapshots via
  `backup-database.yml`.

### End-to-end: local edit → live
1. Edit code under `freezone-api/**` (backend) and/or `freezone-web/**` (storefront/admin).
2. Run the build gates locally (§9.3) — and `npm test` for the affected package.
3. Commit and **push to `main`**.
4. On push:
   - **Netlify** Git build rebuilds `freezone-web` → storefront **and** admin live (~1–3 min).
   - **GitHub Actions** runs verify → deploys the **API to Fly** *if the push touched a path
     filter* (~3–6 min); Fly migrates the DB on boot. A docs-only / `freezone-storefront/`-only
     push does **not** trigger the Fly deploy (but Netlify still rebuilds).
5. Hard-refresh — `index.html` is served `no-cache`, so the new bundle loads immediately.

### Git commands to ship
```bash
git checkout main
git pull
# ...edit files under freezone-web/** and/or freezone-api/**...
git add <changed files>
git commit -m "feat: <what changed>"      # conventional commits: feat|fix|chore|docs
git push origin main                       # → Netlify rebuild (+ Fly deploy if API/web/fly paths)
```
- **Manual API-only deploy** (bypass CI): `flyctl deploy -a freezone-website --remote-only`.
- **Manual full deploy** (no code change): `gh workflow run deploy-production.yml`.
- **Fly ops** (seed admin, snapshots, cancel test order): `gh workflow run ops-fly.yml -f action=<...>`.

### Branch policy (read before pushing to `main`)
- The repo's golden rule (`§9`-style) historically said *"never commit directly to the default
  branch"*; live-ops notes (`.claude-state.md`) relax this to: **direct push to `main` is OK for
  small/safe fixes**; larger/riskier work goes on a `claude/<topic>` or `feat/<scope>` branch →
  PR → merge to `main` (the merge still triggers both deploys).
- **To make a change appear immediately on the live site + admin panel, the target is always
  `main`** (direct push, or merge a branch into it). There is no separate staging branch.
- Red lines: never force-push `main`, never amend pushed commits, never `--no-verify`, never
  rewrite history without explicit approval.

### Other workflows (no deploy)
`ci.yml` (every push/PR — all 3 packages), `backup-database.yml` (daily 03:00 UTC snapshot),
`daily-summary.yml` (daily issue), `import-globaliraq[-full].yml` (manual catalog imports),
`lighthouse.yml` (weekly + manual audit), `ops-fly.yml` (manual Fly admin).

---

## 12. Risks / fragile areas (touch carefully)

- **Live production.** freezone-iq.com + Fly API + ~1500 real products. No destructive DB ops
  without owner sign-off.
- **Catalog OOM (solved-but-fragile).** `getProductsCatalog` MUST use the lean include (no EAV
  `attributeValues`) + the single-flight/SWR cache (`lib/ttl-cache.ts`). Re-adding the deep
  Prisma include to the bulk bootstrap re-introduces a >1.5 GB heap crash (Fly = 2 GB, node
  `--max-old-space-size=1536`).
- **Implicit routing.** Renaming/moving a `route.ts` folder silently changes the URL; a new
  catch-all `[...slug]` segment throws at startup; if esbuild's entry glob/`outbase` drifts,
  prod emits no routes and crash-loops (dev via tsx still "works").
- **API tests are a hardcoded list** in `freezone-api/package.json` — a new `*.test.ts` won't run
  in CI unless added there.
- **Hardcoded API origin** `https://freezone-website.fly.dev` appears in `api-internal.ts`,
  `prerender.mjs`, `seo-product-404.ts`, `_redirects`, `_headers`, `netlify.toml`s — change all
  if the host moves. **`VITE_*` are build-time baked** → changing them needs a full redeploy.
- **Trailing-slash canonical** must stay identical across `prerender.mjs`, `Seo.tsx`, and the API
  `sitemap.xml` route, or canonicals/hreflang break.
- **Three cookie SameSite envs** are independent; cross-origin needs `none`+`Secure` or the
  cookie silently drops and that subsystem breaks.
- **In-memory rate limiter + catalog cache assume a single Fly machine** (`min_machines_running=0`,
  single replica). Scaling >1 replica breaks limit/cache coherence.
- **`adminPasswordMatches()` returns true for any input when `ADMIN_REQUIRE_PASSWORD != "true"`**
  — the prod boot guard mitigates this for production only.
- **freezone-storefront (Next.js) is abandoned** (ADR-003) and deployed nowhere — don't develop
  against it. `freezone-web`'s `app/` folders and `"use client"` pragmas are meaningless
  leftovers (it is a Vite SPA); its `Dockerfile` is stale Next.js cruft — do not use it.

## 13. Known-stale docs (don't trust over the code)

- `netlify.toml` (root) — dead config; real delivery in `freezone-web/public/_redirects`+`_headers`.
- `deploy.env.example`, `docs/SECURITY_REVIEW.md`, `docs/runbooks/secrets.md` — reference removed
  passwordless/secret-link admin + `JWT_SECRET` + legacy gates that no longer apply.
- `docs/ARCHITECTURE.md` — still calls the Next.js storefront "Phase 2" (killed by ADR-003).
- `README.md` says Node 20; **CI/workflows use Node 22** (authoritative).
- `API_CONTRACT.md` — partially stale (e.g. claims `contact` is zod-free; it now uses zod).
- Newest ground-truth: `.claude-state.md`, `RESUME_STATUS.md` (2026-06-14/15).

## 14. Definition of done

Builds pass on a fresh `install → migrate → seed → run`; the affected flow works in **both**
Arabic and English with no broken pages; admin-facing changes are operable from `/admin`; new
endpoints are validated + authorized + reflected in `API_CONTRACT.md`; new public pages are
prerendered + in the sitemap + bilingual; nothing that previously worked is broken.

---

# FreeZone Multi-Agent Operating System

This project ships with reusable **skills** (`.claude/skills/`) and specialized **subagents**
(`.claude/agents/`). Use them as the default operating procedure for FreeZone work.

### Skills — when to use which
1. **Always run `freezone-repo-intelligence` before any large change** — it maps the monorepo,
   the affected frontend/backend files, routes, API contracts, deployment risk, and produces a
   safe plan. Inspect-only; never implements.
2. For storefront **UI/UX** work (homepage, header, hero, category bar, product cards, search,
   responsive, RTL/Arabic) → **`freezone-ui-overhaul`**.
3. For **catalog / filters / categories / brands / specs / variants** work → **`freezone-catalog-filters`**.
4. For **dashboard / admin / product editor / order management** work → **`freezone-dashboard-system`**.
5. **Before any commit / push / deploy** → **`freezone-qa-deploy`** (build, lint, routes, API
   compat, responsive, deploy-risk gate). Never push if the build fails.

### Subagent team — prefer parallel teams for independent work
- **freezone-architect** (opus) — planning, dependency mapping, API/frontend contracts, risk,
  splitting work. Does not implement unless asked.
- **freezone-ui-designer** (sonnet) — design audit, visual system, conversion, RTL/LTR, responsive.
- **freezone-frontend-engineer** (sonnet) — implements React/Vite, components, routes, state, CSS.
- **freezone-api-engineer** (sonnet) — implements Express/Prisma APIs, catalog/filter endpoints,
  DB-safe changes.
- **freezone-qa-reviewer** (sonnet) — verification, build/lint/test, regressions, deploy readiness.
- **freezone-performance-seo** (sonnet) — bundle size, image loading, metadata, Core Web Vitals.

### Conflict & coordination rules
- **Only one agent edits a given file at a time** (use worktree isolation for parallel writers).
- **Frontend and backend agents must coordinate any API-contract change** before implementing.
- **QA does not edit** unless explicitly asked — it inspects and reports.

### Every change must carry
1. **Plan** → 2. **Implementation** → 3. **Verification** (build/lint/type/test) →
4. **Commit message** (conventional commits) → 5. **Rollback note**.

### Deployment discipline (see §11)
- **Build before push.** **Push `main` only when green.** Always **report deployment risk**
  (push to `main` auto-deploys: Netlify rebuilds the web SPA; Fly deploys the API on path-matched
  pushes). For anything non-trivial, prefer a `feat/<scope>` or `claude/<topic>` branch → PR.
