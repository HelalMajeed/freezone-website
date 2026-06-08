# Next Session Handoff — FreeZone IQ

Snapshot at the end of the final completion session. Read this first, then
`docs/FINAL_COMPLETION_MATRIX.md` and `docs/GLOBAL_COMPLETION_AUDIT.md`.

## State of the repo

- Branch `main`, working tree clean except expected untracked `.claude/` and
  `CLAUDE.md` (these must never be staged).
- All four completion branches are merged into `main`:
  `complete/api`, `complete/dashboard`, `complete/public`, `complete/ops`.
  All merges were clean (no conflicts).
- No Prisma migration was introduced; `prisma generate` is clean and all 31
  existing migrations remain.
- **Not deployed.** Deployment is performed by a human; do not push.

## What is complete (verified this session)

All three packages build and test green:

| Package | Commands (all PASS) |
|---------|---------------------|
| freezone-api | `npx prisma generate`; `npm run build`; `npm test` (130/130); `npm run routes:check` |
| freezone-web | `npm run lint`; `npx tsc -b`; `npm run build` (+ prerender: 20 static shells, 87 product pages x EN/AR) |
| freezone-storefront | `npm run build` (Next, 4/4 static pages) |

Resolved this session (see audit R1–R14): legacy-route RBAC + audit attribution,
server-side shipping recompute, order-transition tests, cart-total tests,
profile dead-end removal, CMS accessible tabs, SEO SearchAction fix,
BreadcrumbList structured data, CI now runs api tests + routes:check, deploy
gated on lint/test/build, daily DB backup, storefront edge security headers, and
the completion docs.

## What remains (priority order)

1. **C1 (Critical) — Sitemap URL mismatch.** `sitemap.xml` emits the wrong route
   shape (no locale, slug/query form) vs live `/{locale}/product/{id}` etc.
   Every entry redirects/404s. API lane.
   - File: `freezone-api/src/app/api/public/sitemap.xml/route.ts`
2. **M1 (Medium) — excludedProvinces not enforced at checkout.** Needs province
   taxonomy alignment (storefront dropdown -> canonical 18 provinces) then a
   server-side city check with a localized error. Cross-lane.
   - Files: `freezone-api/src/app/api/public/orders/route.ts`, `schema.prisma`,
     `freezone-web/src/app/locale/checkout/page.tsx`
3. **M2/M4 (Medium) — Category/brand SEO.** Prerender category/brand shells and
   move from opaque ids to slugs; reconcile with C1. Plan as one change.
4. **M3 (Medium) — Storefront ADR.** Record that Vite+prerender is the SEO path
   (Next storefront paused) or commit to the migration. `docs/adr/`.
5. **M6/M7/M8 (Medium) — Test depth.** jsdom/component+a11y tests, Playwright
   smoke/a11y specs, pc-build + web coupon-service unit tests.
6. **Low items L1–L8** — Zod on coupons, paymentMethod allowlist, responsive
   page grids, ConfirmDialog focus trap, order-tracking tests, prod CORS
   localhost fallback, shared rate-limit store, schema drift assertion.

## Key files

- Routing/RBAC (dashboard): `freezone-web/src/routes/dashboard-routes.tsx`
- Dashboard UI kit (focus trap, tabs, confirm): `freezone-web/src/components/dashboard/ui/index.tsx`
- Checkout (server-trusted pricing + shipping recompute): `freezone-api/src/app/api/public/orders/route.ts`
- Order state machine: `freezone-api/src/lib/admin-orders-query.ts`
- Admin RBAC/audit guards: `freezone-api/src/lib/admin-route-guard.ts`, `admin-audit.ts`, `admin-auth.ts`
- Sitemap (needs C1 fix): `freezone-api/src/app/api/public/sitemap.xml/route.ts`
- Prerender: `freezone-web/scripts/prerender.mjs`
- SEO components: `freezone-web/src/components/seo/*`
- CI/Deploy: `.github/workflows/ci.yml`, `deploy-production.yml`, `backup-database.yml`
- Edge headers: `netlify.toml`

## Run commands

```bash
# API (run from freezone-api/)
npx prisma generate
npm run build
npm test
npm run routes:check

# Web (run from freezone-web/)
npm run lint
npx tsc -b
npm run build        # includes postbuild prerender

# Storefront (run from freezone-storefront/)
npm run build
```

This repo does NOT use npm workspaces — install/run inside each package dir.

## Risks

- **C1 sitemap** silently degrades SEO; highest-value next fix but cross-checks
  against the slug decision (M4) — fix them together to avoid emitting URLs the
  app doesn't serve.
- **M1 delivery restriction** is a correctness gap; a naive string compare would
  either never match or wrongly block orders. Align the province vocabulary
  first.
- Rate limits are in-memory per process — not shared across scaled instances.
- Schema drift is not asserted in this env (no DB); run `prisma migrate status`
  against staging before a migration-bearing deploy.

## Exact next step

Fix C1: rewrite `freezone-api/src/app/api/public/sitemap.xml/route.ts` to emit
`/{locale}/product/{id}`, `/{locale}/category/{id}`, `/{locale}/brand/{id}` for
each supported locale, then validate by fetching `/sitemap.xml` and confirming a
sampled URL returns 200 on the storefront. Coordinate the id-vs-slug decision
(M4) before finalizing the URL shape.
