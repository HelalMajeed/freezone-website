# FreeZone — Enterprise Safety Report (Sprint E1)

> Living document. Each fix records **Plan → Implementation → Verification →
> Rollback**. Nothing is marked `VERIFIED-LIVE` without a real production probe;
> branch-only work is `IMPLEMENTED (pending deploy)`. No "complete/100%" claims
> without measured evidence.
>
> Branch `claude/enterprise-global-readiness-audit`. Source of gap IDs:
> `docs/ENTERPRISE_GAP_AUDIT.md`.

## Status board

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| SEO-1 | Real 404 for unknown category/brand slugs | Critical | **DONE — VERIFIED LIVE in production** (PR #61 merged `dc6f65e`) |
| SEC-2 | Fail-closed legacy admin password | Medium | **IMPLEMENTED + unit-tested (branch `claude/e1-auth-hardening`, pending PR)** |
| SEC-3 | `requireSuperAdminMutate` for user-mgmt writes | Medium | **IMPLEMENTED (same branch, pending PR)** |
| OPS-3 | API availability (min_machines_running=1) | High | TODO (cost decision) |
| SEC-1 | Enforce CSP (drop Report-Only) | Medium | TODO (review violation reports first) |
| SEC-4 | CSRF assertion on admin mutations | Medium | TODO |
| OPS-1 | Real, verified DB backup (owner secrets) | High | BLOCKED (needs secrets) |
| OPS-2 | Restore drill | High | BLOCKED (needs OPS-1) |
| OPS-4 | Error monitoring + uptime alerting | High | BLOCKED (needs `SENTRY_DSN`) |

---

## SEO-1 — Real HTTP 404 for unknown category & brand slugs

**Problem (live-confirmed 2026-07-03):** `GET /en/category/zzz-nope-xyz/` → **200**
and `GET /en/brand/zzz-nope-xyz/` → **200** (soft-404). Only the *product* route
had a real-404 edge function (`seo-product-404.ts`); category/brand were left out.
Violates the CLAUDE.md success targets `categories: real 404` / `brands: real 404`
and creates an infinite crawlable soft-404 space (crawl-budget + index-quality
drain for a ~1500-product store).

### Plan
Add a second Netlify edge function that mirrors the proven product-404 pattern
(fail-open) for the two landing routes, deciding existence against the **exact same
API data the storefront bootstrap uses** so it can never 404 a page the SPA would
render.

### Implementation
- New file: `freezone-web/netlify/edge-functions/seo-catbrand-404.ts`
  (`config.path = /en|ar/category/*` + `/en|ar/brand/*`).
- Existence checks mirror the client precisely:
  - **Category** valid ⇔ slug ∈ `GET /api/ssr/catalog/categories?locale=…` ids
    (`CategoryLandingPage.tsx:33` uses `c.id === slug`; category `id` **is** the DB
    slug).
  - **Brand** valid ⇔ slug matches a known brand `brandSlug(name)`/name **OR**
    `GET /api/ssr/catalog/products?brand=<slug>&pageSize=1` returns `total > 0`
    (mirrors `BrandLandingPage.tsx:80` which bounces only on `!brand && total===0`;
    `brandSlug()` copied verbatim and annotated to stay in sync).
  - Same data source as the bootstrap (`getCategoriesCatalog`/`getBrandsCatalog`),
    so the edge decision and the SPA decision cannot diverge.
- **FAIL OPEN:** any non-2xx / timeout / non-decisive response serves the page
  normally (2500 ms timeout, mirrors `seo-product-404.ts`). A backend hiccup must
  never 404 a valid page.
- On a genuine miss: serve the SPA shell with `status 404` + `x-robots-tag:noindex`
  + `cache-control:no-store` (identical to the product edge fn).

**Live pre-checks (endpoint contract validated before writing, 2026-07-03):**
categories return `[{id:"gaming",…},…]` (id = slug); brands return
`[{name:"MSI",…},…]`; unknown `brand=zzz-nope-xyz` → `total:0`; known `brand=HP` →
`total:34`. So both the category-membership and brand `total===0` signals are
decisive.

### Verification
- **Regression (done, local):** `npx tsc -b` → exit 0 (the `netlify/` dir is outside
  `tsconfig` `include: src/**`); `npm run lint` → exit 0 (`eslint src` scope). The
  app bundle is untouched — this file ships only via Netlify edge-function
  auto-discovery, exactly like the live `seo-product-404.ts`.
- **Behavior — VERIFIED on the PR #61 Netlify deploy preview (2026-07-03),** on
  both Netlify projects (`freezone-web` + `freezoneweb`):
  - `/en/category/zzz-nope-xyz/` → **404** + `X-Robots-Tag: noindex` +
    `Cache-Control: no-store` ✅
  - `/en/brand/zzz-nope-xyz/` → **404** ✅
  - `/ar/category/zzz-nope-xyz/` → **404**, `/ar/brand/zzz-nope-xyz/` → **404** ✅
  - `/en/category/gaming/` → **200**, `/en/brand/hp/` → **200**,
    `/ar/category/gaming/` → **200** (valid pages unchanged) ✅
- **VERIFIED LIVE in production (`https://freezone-iq.com`, 2026-07-03)** after PR #61
  merged to `main` (`dc6f65e`); the fix went live ~85 s after deploy:
  - `/en/category/zzz-nope-xyz/` → **404** (`X-Robots-Tag: noindex`, `Cache-Control:
    no-store`); `/ar/category/zzz-nope-xyz/` → **404**
  - `/en/brand/zzz-nope-xyz/` → **404**; `/ar/brand/zzz-nope-xyz/` → **404**
  - `/en/category/gaming/`, `/en/brand/hp/`, `/ar/category/gaming/` → **200** (valid,
    unchanged); `/en/product/99999999/` → **404** (existing product fix, no regression)
- Note: **3 Netlify projects** (`freezone-web`, `freezoneweb`, `freezone-admin`) build
  each PR/push — confirms audit **OPS-8** (multiple web-deploy targets); all returned
  identical correct results. Worth consolidating to one deploy path.

**SEO-1 status: DONE (verified live).**

### Rollback
Delete `freezone-web/netlify/edge-functions/seo-catbrand-404.ts` and redeploy (or
`git revert` the commit). No other file is touched; no schema/data/config change; no
dependency added. Category/brand pages revert to the prior soft-404 (200) behavior —
i.e., exactly today's state.

---

## SEC-2 — Fail-closed legacy admin password

**Problem:** `adminPasswordMatches(_input)` returned **`true` for any input** when
`ADMIN_REQUIRE_PASSWORD !== "true"`, and `getAdminPassword()` fell back to the literal
`"changeme2024"`. In production the boot guard (`admin-secrets.ts`) forces
`ADMIN_REQUIRE_PASSWORD=true`, so the timing-safe branch always runs and the fail-open
path is unreachable — but it is a latent fail-open that any staging/misconfig/refactor
without those prod semantics would expose (the legacy `fz_admin_session` grants admin
read to `/api/admin/*`).

### Plan
Make the function fail closed and remove the well-known default, without changing the
production-correct timing-safe compare. Add a unit regression test.

### Implementation (`freezone-api/src/lib/admin-session.ts`)
- `adminPasswordMatches`: returns `false` unless `ADMIN_REQUIRE_PASSWORD === "true"`
  **and** a non-empty `ADMIN_PASSWORD` is configured; otherwise the same
  `timingSafeEqual` NFC/lowercase compare as before (existing behavior preserved).
- `getAdminPassword`: returns `process.env.ADMIN_PASSWORD ?? ""` (no `changeme2024`).
- Only caller is `admin/login/route.ts` (legacy login); no other code/test depended on
  the old defaults (grep-verified).

### Verification
- New unit test `src/lib/admin-session.test.ts` (added to the API test list in
  `package.json`): **5/5 pass** — fail-closed when not required, no accept-any on a set
  value, fail-closed when required-but-unset, correct match when required+configured,
  and `getAdminPassword()` has no default. `npm run build` (tsc `--noEmit` + esbuild) →
  exit 0; `npm run routes:check` → OK.
- Production behavior unchanged (boot guard already forced the timing-safe branch).

### Rollback
`git revert` the commit — restores the previous function bodies. No schema/data change.

---

## SEC-3 — `requireSuperAdminMutate` for user-management writes

**Problem:** `requireSuperAdminRead` returns early for `legacy`/`system` actors
**without a role check**, yet it guarded the user-management **POST/PATCH/DELETE**
handlers (create/update/delete admin accounts). With `LEGACY_ADMIN_COOKIE=true`, a
legacy-cookie holder could mutate admin accounts despite the "legacy = read-only"
design (privilege escalation).

### Plan
Add a dedicated mutate guard that rejects legacy actors (mirroring `requireAdminRole`'s
CUD rule) and apply it to the three write handlers, leaving GETs on the read guard.

### Implementation
- `freezone-api/src/lib/admin-auth.ts`: new
  `requireSuperAdminMutate(req) = requireAdminRole(req, ["SUPER_ADMIN"])` — requires a
  dashboard SUPER_ADMIN session; a legacy cookie gets `403 LEGACY_SESSION_READ_ONLY`
  in production (direct-login is disabled there).
- Swapped to the mutate guard: `dashboard/users/route.ts` **POST**;
  `dashboard/users/[id]/route.ts` **PATCH** + **DELETE**. GET handlers unchanged
  (still `requireSuperAdminRead`).

### Verification
- `npm run build` (tsc `--noEmit` + esbuild) → exit 0; `npm run routes:check` → OK.
- Behavioral (post-deploy / CI): a dashboard SUPER_ADMIN can still create/update/delete
  users; a legacy-cookie session gets `403` on those writes but can still read (GET).
  (Full auth-integration test needs a DB → runs in CI; logic is a thin wrapper over the
  already-tested `requireAdminRole`.)

### Rollback
`git revert` the commit — the three handlers return to `requireSuperAdminRead` and the
new function is removed. No schema/data change.
