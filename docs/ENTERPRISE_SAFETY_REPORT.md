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
| SEC-2 | Fail-closed legacy admin password | Medium | **DONE — merged (PR #62 `1e4ea46`), API deployed, `/health` ok** |
| SEC-3 | `requireSuperAdminMutate` for user-mgmt writes | Medium | **DONE — merged (PR #62), API deployed** |
| SEC-4 | CSRF-origin guard on admin/dashboard mutations | Medium | **DONE — merged (PR #63 `5791baa`), API deployed** |
| OPS-3 | API availability (min_machines_running=1) | High | **IMPLEMENTED (branch `claude/e1-availability`, pending PR + cost approval)** |
| SEC-1 | Enforce CSP (drop Report-Only) | Medium | TODO (review violation reports first) |
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

---

## SEC-4 — CSRF-origin guard on admin/dashboard mutations

**Problem:** No anti-CSRF mechanism existed. The admin SPA (`freezone-iq.com`) calls the
API cross-site (`freezone-website.fly.dev`) with `credentials:include`, so the session
cookie rides cross-site requests. CORS blocks *preflighted* cross-origin writes, but a
non-preflighted "simple request" (e.g. form-encoded POST) is a residual CSRF vector.

### Plan
Add an app-layer Origin check for state-changing admin/dashboard requests, reusing the
**exact CORS allow-list** so it can never reject a request CORS already permits.

### Implementation
- New `freezone-api/src/lib/csrf-origin.ts` (pure, unit-tested):
  - `buildAllowedOriginMatcher(env?)` — the allow-list builder, factored out of the
    inline CORS logic (`CORS_ORIGINS` or the prod defaults; exact + regex entries).
  - `shouldRejectMutationOrigin(method, path, origin, isAllowed)` — true only for a
    `POST/PUT/PATCH/DELETE` to `/api/admin/*` or `/api/dashboard/*` whose `Origin` is
    **present but not allow-listed**. Absent Origin (server-to-server, curl, internal
    importer) passes, matching CORS.
- `freezone-api/src/server.ts`:
  - `resolveCorsOrigins()` refactored to use `buildAllowedOriginMatcher()` (behavior
    unchanged).
  - New `csrfOriginMiddleware()` registered after `rateLimitMiddleware`; returns
    `403 { code: "CSRF_ORIGIN_REJECTED" }` on a rejected mutation.

**Why it cannot break a live admin flow:** the check is a strict subset of the CORS
allow-list. The admin UI works today → its origin is already allow-listed → its
mutations pass. Only cross-origin forgeries from non-allow-listed origins are newly
blocked.

### Verification
- New unit test `src/lib/csrf-origin.test.ts` (added to the API test list): **5/5 pass**
  — default list matches prod/netlify/localhost & rejects others, `CORS_ORIGINS`
  override, forgery rejected on admin+dashboard mutations, legit + no-Origin allowed,
  safe methods / non-admin paths / preflight ignored. `npm run build` (tsc `--noEmit` +
  esbuild) → exit 0; `npm run routes:check` → OK.
- Post-deploy smoke (recommended): a real admin mutation from the admin UI still works;
  a `POST /api/admin/*` with `Origin: https://evil.com` returns `403
  CSRF_ORIGIN_REJECTED`.

### Rollback
`git revert` the commit — removes the middleware + lib and restores the inline CORS
origin logic. No schema/data change; no dependency added.

---

## OPS-3 — API availability (no cold-start / no auto-stop SPOF)

**Problem:** The Fly API ran with `min_machines_running = 0` + `auto_stop_machines =
"stop"` — a single machine that stops when idle. The first request after idle pays a
cold-start, and there is no always-on instance (single point of failure).

### Plan
Keep at least one machine always warm.

### Implementation (`fly.toml`)
- `min_machines_running = 0 → 1`. Excess machines still auto-stop; `auto_start_machines`
  unchanged. (True HA would be `>= 2` across regions — noted as a later step.)

### ⚠️ Cost note (owner decision — merging this PR approves it)
Keeping one `shared-cpu-1x` / `2048mb` machine running 24/7 adds a small always-on Fly
charge (on the order of a few USD/month) versus the near-zero idle cost of auto-stop.
This is the one E1 item with a recurring cost, hence delivered as a review PR rather
than merged automatically.

### Verification
- Config-only change; `fly.toml` is valid TOML (no code/build impact).
- Post-merge (recommended): `flyctl status -a freezone-website` shows a machine in
  `started` state even when idle; a first request after idle has no cold-start delay;
  `/health` stays `200`.

### Rollback
Revert `min_machines_running` to `0` and redeploy (`git revert`). Instantly returns to
scale-to-zero. No data/schema impact.
