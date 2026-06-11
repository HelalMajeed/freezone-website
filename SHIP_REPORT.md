# SHIP_REPORT — FreeZone live launch (2026-06-11)

Live results of the ship run. Companion: `SHIP_STATUS.md` (ground truth) · `FINAL_REPORT.md` (branch contents).

## Pre-ship gates

| Gate | Result | Evidence |
|---|---|---|
| API `routes:check` | PASS | 131 manual + 160 auto routes reconciled |
| API `test` | PASS | 238 node tests |
| API `build` (esbuild) | PASS | local 2026-06-11 |
| Web `lint` | PASS | eslint clean |
| Web `test` | PASS | 32/32 vitest |
| Web `build` (PRERENDER_SKIP=1) | PASS | vite built in ~9.4s |
| Fly boot secrets present | PASS | `ADMIN_SESSION_SECRET` len 64, `ADMIN_PASSWORD` len 24, `ADMIN_REQUIRE_PASSWORD=true`, distinct |
| Prod SUPER_ADMIN seeded | PASS | `admin@freezone-iq.com` created; live login returns 401 on wrong pw (row exists) |
| Cross-origin cookies | PASS | `DASHBOARD_COOKIE_SAMESITE=none`, `CUSTOMER_COOKIE_SAMESITE=none` set on Fly |
| Pre-purge DB backup | PASS | Fly volume snapshot `vs_Rj3qLDVLJpNAc13aQDaPB` (pg_dump path is a no-op — see DR doc) |

## Catalog import (globaliraq)

- Starting prod catalog: 87 published legacy products / 18 categories / 14 brands.
- Purged 99 stale soft-deleted imports (96 pre-fix corrupt + 3 post-fix test) to free their source handles — owner-approved; Fly volume snapshot taken first.
- Import driver: GitHub `import-globaliraq` workflow (dashboard-auth login fixed) for trials, then the self-looping `import-globaliraq-full` workflow, `autoPublish=true`.

**Importer bug found + fixed mid-run (commit 7ee6018):** the two `sitemap.ts`
fetches (sitemap walk + per-product `/products/handle.json`) had **no timeout**.
When globaliraq accepted a connection but never sent a body, the fetch awaited
forever — the batch promise never settled, the `ImportBatch` row stayed
`running`, and the whole loop stalled. Observed: full-run batch 1 imported
100/100 cleanly, batch 2 hung 53 min. Fix: 20s `AbortSignal.timeout` on every
outbound request; per-product fetch now treats abort/network errors as transient
(retry+backoff, then fail that one product) so a single bad upstream can never
wedge a batch. Built + 35/35 import tests pass. Deployed; API restarted (killed
the zombie batch), the one stale `running` lock released (owner-approved
`running→cancelled`, no products touched), import re-dispatched.

**FINAL RESULT:** **1421 products imported** (every globaliraq handle; the live
catalog was larger than the ~1226 estimate), **0 duplicate sourceHandles**.
Final catalog: **1509 products total** = 88 legacy + 1421 imported, of which
**1112 are published live** (the rest stayed draft — autoPublish gate failures /
`needs-review` categories, flagged for manual triage). `classification:repair`
run after import for filter facets.

A second stall (batch 2 hung again) was root-caused to two more unbounded
operations and fixed (commit 0747111): `dns.lookup` in the SSRF guard had no
timeout, and there was no overall per-product ceiling. Added a 10s DNS deadline
and a hard 120s per-product timeout (a slow product is failed, never hangs the
batch). After that the import ran to completion at ~30 products/min.

Spot check (#722): name "Cougar Puri TKL RGB keyboard", brand Cougar, 189,000 IQD, oldPrice null, warranty + specs present, image `/uploads/products/2026/06/*.webp` (local, 200/webp) — red line (no source-CDN URLs) holds.

## Post-launch stabilization — catalog scaling (the big one)

After the import the API began **crash-looping** (homepage data down). Root-caused
in stages and fixed:

1. **Container OOM (exit 137, 1 GB):** the storefront loads the WHOLE published
   catalog on every `storefront-bootstrap` (`getProductsCatalog`, no limit).
2. **Added catalog cache** (commit 31ec7be) — single-flight + stale-while-revalidate
   so concurrent requests share one load. Not enough on its own.
3. **V8 heap abort (exit 134) even at 2 GB:** memory scaled to 2 GB (owner-approved)
   + Node `--max-old-space-size=1536` (commit e84cd95, fly.toml persisted). Still
   aborted — a single load needed >1.5 GB heap.
4. **TRUE root cause (commit 3c48990):** the deep Prisma include
   (`attributeValues` EAV + nested `category.categoryAttributes`) made findMany
   materialize ~15k EAV rows + repeated attribute trees → >1.5 GB object graph.
   Raw text was only ~1.2 MB, so it was pure include amplification. Fix: the bulk
   bootstrap catalog now uses the **lean include** (cards + images + brand +
   category slug); `specs` still come from the product `specs` JSON column, EAV
   facet filtering is served by the paginated `/api/ssr/catalog/products`, and the
   PDP keeps the rich EAV path via its own per-id query.

**Result after the lean fix (measured live):** bootstrap **200 in ~1–2.4 s** (was
502/crash), **10/10 rapid requests 200**, no new OOM/abort events, machine stable
at 2 GB. `freezone-iq.com/en/`, `/ar/`, `/en/products/` all 200.

## Deploy

- Ship merge `feat/global-launch` → `main` (3c258be) pushed 2026-06-11 05:25Z.
- `deploy-production` run **27325824709 — all 4 jobs green**: Verify API, Verify web, **Fly.io API + DB migrate**, Netlify storefront.
- Importer-fix deploy run **27328447564 — green** (sha 7ee6018), API restarted healthy.
- Boot proof: `/api/public/payment-methods` (a global-launch-only route backed by the `global_launch_foundations` migration) returns the COD + env-gated gateway list → migration applied + boot assertion passed + new API serving.
- Storefront: Netlify Git integration auto-rebuilds on push (the Actions Netlify job is a credential-less no-op).

## Live verification (freezone-iq.com)

| Check | Result |
|---|---|
| API `/health` | `{"ok":true}` |
| Home `/ar` | `lang=ar` + `dir=rtl` + Arabic title ✓ |
| Home `/en` | `lang=en` + English title ✓ |
| hreflang alternates | `en, ar, x-default` ✓ |
| `robots.txt` | Disallows `/admin`,`/dashboard`,`/api`; `Sitemap:` proxied ✓ |
| `sitemap.xml` | `application/xml`, 44 KB (was HTML pre-ship) ✓ |
| Security headers | `X-Frame-Options: DENY`, HSTS, CSP-Report-Only present (absent pre-ship) ✓ |
| Product page (`/en/product/826/`, imported AOC monitor) | `Product` + `BreadcrumbList` JSON-LD present ✓ |
| `/admin` shell | HTTP 200, `X-Robots-Tag: noindex` ✓ |
| Product image | `…/uploads/products/2026/06/product-826-*.webp` → 200 `image/webp`, local re-host (no source CDN) ✓ |
| `/uploads/*` proxy via site origin | 200 `image/webp` ✓ |
| Admin dashboard login (prod) | rejects wrong password 401; the import authenticates via `/api/dashboard/auth/login` each run → login proven in prod ✓ |
| Catalog stability under load | bootstrap 200 in ~1–2.4 s, 10/10 rapid requests 200, no OOM (post lean-catalog fix) ✓ |
| **COD order round-trip** | order **FZ-00006** placed via `/api/public/orders` (product 2142, 378,000 IQD, COD) → trackable via `/api/public/orders/track` (status `pending`, correct item + local webp) → **cancelled via admin route** (`/api/admin/orders/6/cancel`: status `cancelled`, stock restored, audit + status event) → re-verified `cancelled` on tracking ✓ — no fake order left |

## Final live state

- **Catalog:** 1509 products (1112 published) live and browsable; images local webp.
- **API:** `freezone-website.fly.dev` stable at 2 GB, catalog cached; no crash loop.
- **Storefront:** `freezone-iq.com` ar (RTL) + en, sitemap XML, security headers, JSON-LD, noindex /admin.
- **Admin:** `/admin` credentialed login live; order lifecycle (place → track → cancel) proven end-to-end on prod.

## Deferred (issues opened)

- **#44** [blocker] Production backups are a no-op (`DATABASE_URL_PROD` unset); Netlify Actions deploy unused.
- Dependabot bumps (incl. react-router ≥7.14.2 advisory), multer 2.x, web Sentry.
- ~309 imported products in DRAFT (autoPublish gate / `needs-review` categories) — manual triage + publish.
- Brand-row creation for imported vendors (free-text `Product.brand` set; `Brand` table not auto-populated → brand pages don't list them).
- Catalog scaling follow-up: the storefront still loads the full product array client-side; consider server-side pagination everywhere as the catalog grows further.
- Memory scaled to 2 GB (from 1 GB) — can scale back if the catalog footprint is reduced; persisted in fly.toml.
