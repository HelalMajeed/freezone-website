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
- Purged 99 stale soft-deleted imports (96 pre-fix corrupt + 3 post-fix test) to free their source handles — owner-approved; snapshot taken first.
- Import driver: GitHub `import-globaliraq` workflow (dashboard-auth login fixed), `autoPublish=true`.
- _Counts and per-batch results filled in below as batches complete._

| Stage | succeeded | failed | skipped | catalog total (published) |
|---|---|---|---|---|
| trial limit=5 | 5 | 0 | 0 | 92 |
| full run | … | … | … | … |

Spot check (#722): name "Cougar Puri TKL RGB keyboard", brand Cougar, 189,000 IQD, oldPrice null, warranty + specs present, image `/uploads/products/2026/06/*.webp` (local, 200/webp) — red line (no source-CDN URLs) holds.

## Deploy

_Filled during Phase 4._

## Live verification

_Filled during Phase 4._

## Deferred (issues opened)

_Filled at close._
