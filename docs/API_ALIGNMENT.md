# API Alignment Audit — `/api/admin/*` vs `/api/dashboard/*`

**Status:** Audit complete. Migration is **optional cleanup**, not blocking — the dashboard works correctly today against the existing `/api/admin/*` routes via the legacy-cookie bridge.

## Why two API namespaces exist

Two parallel naming conventions are in use on the backend:

| Prefix | Origin | Authentication path |
|--------|--------|--------------------|
| `/api/admin/*` | Original Freezone admin (now-deleted UI) and CI tools | `isAdminAuthenticatedFromRequest` (HMAC `fz_admin_session` cookie) or `getCurrentDashboardUser` via the route guards in `freezone-api/src/lib/admin-route-guard.ts` |
| `/api/dashboard/*` | New dashboard, since the Auth/Users redesign | `getCurrentDashboardUser` (DB-backed `fz_dashboard_session` token) |

The new dashboard login at `POST /api/dashboard/auth/login` issues **both** cookies — `fz_dashboard_session` (the source of truth for dashboard sessions) and the legacy `fz_admin_session` HMAC cookie. This means the dashboard's `fetch(..., { credentials: "include" })` calls succeed against `/api/admin/*` routes that only check the legacy cookie, without any session-management layer change.

## Endpoints used by the new dashboard

| Page | Endpoint | Prefix | Why this prefix |
|------|----------|--------|-----------------|
| Login / Profile / Users / Audit | `/api/dashboard/auth/*`, `/api/dashboard/users`, `/api/dashboard/audit`, `/api/dashboard/overview` | `dashboard` | Authored alongside the dashboard. |
| Brands | `/api/admin/brands` | admin | Predates the dashboard; refactored for dual-auth. |
| Products | `/api/admin/products`, `/api/admin/products/:id/{images,duplicate}` | admin | Same. |
| Categories | `/api/admin/categories` | admin | Same. |
| Orders | `/api/admin/orders` | admin | Same. |
| Coupons | `/api/admin/coupons` | admin | This branch added `PATCH/DELETE` to it. |
| Media library | `/api/admin/media`, `/api/admin/upload` | admin | Same. |
| Site settings | `/api/admin/site-config` | admin | **New** in this branch. |
| Design (theme tokens) | `/api/admin/theme` | admin | Pre-existing. |
| CMS (per-entity) | `/api/admin/{hero-slides,ticker,promo-banners,home-spotlights,trust-bar,showroom-media,social-links}` | admin | **New** in this branch — each follows the simple `isAdminAuthenticatedFromRequest` pattern. |
| Data quality | `/api/admin/data-quality` | admin | Pre-existing. |

## CI / unattended automation depends on `/api/admin/*`

Two GitHub Actions workflows rely on the legacy direct-login flow:
- `.github/workflows/import-globaliraq.yml` — `POST /api/admin/login` then `/api/admin/import/globaliraq/*`
- `.github/workflows/daily-summary.yml` — `POST /api/admin/login` then `/api/admin/import/globaliraq/batches`

Both authenticate via the `ADMIN_PASSWORD` env var, not via dashboard user accounts. **They cannot move to `/api/dashboard/*` without also adding a CI-token flow** (e.g. `POST /api/dashboard/auth/ci-token`). Keeping `/api/admin/login` and the legacy direct-login routes is the simplest answer for now.

## Why the migration is not blocking

1. **Identity** — dashboard login sets both cookies, so every `/api/admin/*` call from the dashboard is authenticated as the correct `AdminUser` (not the legacy direct-login session).
2. **Authorization** — the route guards (`requireAdminRole`, `requireSuperAdminRead`) read `getCurrentDashboardUser(req)` and enforce the dashboard role on every mutation.
3. **Audit** — `logAdminAction` writes the same audit log the dashboard surfaces at `/dashboard/audit`, regardless of which prefix served the request.

## Recommended future cleanup (not in scope)

If you decide to align everything, here's the order I'd recommend:

1. **Add mirror routes** under `/api/dashboard/catalog/*` for the entities the dashboard owns end-to-end: brands, categories, coupons, site-config, theme, hero-slides, ticker, promo-banners, home-spotlights, trust-bar, showroom-media, social-links. Each mirror calls the same `lib/*` handler, so no logic is duplicated.
2. **Update dashboard frontend** to call the new paths. This is a mechanical rename of ~25 `dashboardApi.{get,post,patch,delete}("/api/admin/...")` strings.
3. **Leave `/api/admin/*`** in place for CI workflows; deprecate by adding a `Deprecation: true` response header and removing the routes from `server.ts` in a later release once CI is converted to a proper service token.
4. **Convert CI** to a service-token flow: introduce a new `AdminUser` role (e.g. `CI_BOT`) and a `POST /api/dashboard/auth/ci-token` endpoint that returns a long-lived token usable as `Authorization: Bearer ...`. Update the workflows.

This is roughly 2–3 hours of mechanical work plus testing — well-bounded but not high priority.

## What's in this branch

This branch (`feature/remove-admin-rebuild-dashboard`) deliberately **did not** rename the endpoints. The decision: ship complete, working dashboard pages against the existing API surface, then revisit naming in a focused follow-up PR. Every dashboard page in this branch documents the path it uses in a comment near the `dashboardApi.{get,post,...}` call, so the migration target list is grep-able.
