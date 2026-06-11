# SHIP_STATUS — FreeZone launch run (2026-06-11)

Ground-truth inventory for the ship run. Supersedes assumptions in RECOVERY-era docs.
Companion: `FINAL_REPORT.md` (what feat/global-launch contains) · `SHIP_REPORT.md` (live results, written during Phase 4).

## Verified deployment reality (evidence-based, not from docs)

| Fact | Evidence |
|---|---|
| `origin/main` (06f25c6) deployed to Fly **2026-06-08**, all 4 jobs green | run 27111984577 |
| **Netlify Actions job is a silent no-op** — `NETLIFY_AUTH_TOKEN`/`NETLIFY_SITE_ID` secrets do not exist; job logs "Netlify credentials not provided, not deployable" then succeeds | job 80011660513 log |
| Storefront actually updates via **Netlify Git integration** building `main` on push | live bundle contains `BreadcrumbList` (commit 36fc594, Jun 8) which the Actions path never deployed |
| **Daily DB backups are silent no-ops** — `DATABASE_URL_PROD` not set; workflow exits 0 with "skip backup"; latest "successful" run produced **0 artifacts** | run 27258893461 artifacts API |
| GitHub repo secrets: only `FLY_API_TOKEN`, `FREEZONE_ADMIN_PASSWORD` (env `production` exists, empty) | `gh api .../actions/secrets` |
| Production catalog: **87 published products / 18 categories / 14 brands** (the 88 legacy originals; one apparently unpublished since May) | `/api/ssr/storefront-bootstrap?locale=en` |
| ~99 globaliraq imports (96 pre-fix + 3 post-fix test) are **soft-deleted** and their handles block re-import (`knownHandles` ignores `deletedAt`) | issues #22/#26 + `run-batch.ts:97-104` |
| Import workflow as on `main` is **broken**: legacy `fz_admin_session` cookie → `UNAUTHENTICATED` on run-batch (RBAC hardening 63e42db is live) | trial run 27319927381 |
| Live `freezone-iq.com/sitemap.xml` returns **HTML** (no `_redirects` proxy in the live build — fixed in feat/global-launch) | curl |

## Branch reality

- `feat/global-launch` = the integration branch: **48 commits ahead of origin/main, 0 behind**; contains ALL local work (agent1-3/*, phase2/*, polish/final-bundle, qa/e2e-playwright-suite, feat/category-tree-delta, and local main's M1 commit). It IS `claude/ship-launch` in ultraplan terms.
- `origin/claude/sprint-5-seo-a11y` (185 behind / 2 ahead): hreflang+canonical link tags — superseded by the trailing-slash canonical + hreflang work already in feat/global-launch. Not merged.
- `origin/feat/data-entry-system` (0 ahead) and `feature/remove-admin-rebuild-dashboard` (0 ahead): fully contained in main. Nothing to merge.
- `origin/flyio-new-files` (1 ahead, 290 behind): Fly launch scaffold, obsolete. Skip.
- Dependabot: 14 open PR branches — deferred (issue), majors skipped per plan.

## Area status

| Area | Status | Notes |
|---|---|---|
| Storefront (browse/search/cart/COD checkout/tracking/CMS pages) | DONE on feat/global-launch | verified 16/16 Playwright on fresh DB (FINAL_REPORT) |
| Admin `/admin` credentialed login + modules | DONE on feat/global-launch | needs Fly secrets + seeded AdminUser BEFORE deploy (boot assertion) |
| Customer accounts / reviews / payments abstraction | DONE on feat/global-launch | COD real; gateways env-gated stubs |
| SEO (prerender categories/brands, `_redirects` sitemap proxy, JSON-LD, hreflang) | DONE on feat/global-launch | prerender fail-loud gate passes: prod bootstrap has 87 products |
| Catalog import (~1226 globaliraq products) | **IN PROGRESS this run** | via run-batch loop, autoPublish=true; ~99 handles blocked by soft-deletes (owner decision — issue) |
| QA gates (API routes:check/238 tests/build; web lint/32 tests/build) | GREEN locally on feat/global-launch | 2026-06-11 |
| DB backups | **BROKEN (no-op)** | blocker issue: needs `DATABASE_URL_PROD` + `BACKUP_GPG_PASSPHRASE` secrets; Fly pg volume snapshots are the only current recovery path |
| Netlify deploy credentials | MISSING (harmless) | site deploys via Netlify Git integration; Actions job no-op — issue opened |

## Ship sequence (this run)

1. ~~QA gates locally~~ ✅
2. Fly: set boot-assertion secrets (`ADMIN_SESSION_SECRET`, `ADMIN_REQUIRE_PASSWORD=true`, `ADMIN_PASSWORD`=FREEZONE_ADMIN_PASSWORD, `*_SAMESITE`) + seed SUPER_ADMIN (`admin@freezone-iq.com`) — via local flyctl (ops workflow push to main was withheld until the Phase-4 ship).
3. Full import: dashboard-auth login → `run-batch` loop (limit=100, autoPublish=true) until exhaustion; then `classification:repair`; restore+publish the 3 clean post-fix test products.
4. Merge `feat/global-launch` → `main`, push (the authorized ship push; includes ops-fly.yml + fixed import workflow), watch `deploy-production` + Netlify build.
5. Live verification incl. one COD order round-trip (then cancel), sitemap/robots/headers/JSON-LD, admin auth.
6. Reports + state files + sprint-report issue.

## Deferred (issues)

- 96 pre-fix soft-deleted products: hard-delete+reimport vs restore — owner decision (destructive-op red line).
- `DATABASE_URL_PROD`/`BACKUP_GPG_PASSPHRASE`/`NETLIFY_*` secrets — owner must create.
- Dependabot PRs (incl. react-router ≥7.14.2 advisory bump), multer 2.x, web Sentry, wishlist/compare persistence, USD dual pricing (P2 list in FINAL_REPORT).
