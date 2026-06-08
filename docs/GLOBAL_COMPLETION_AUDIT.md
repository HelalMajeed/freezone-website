# Global Completion Audit — FreeZone IQ

Audit of remaining issues after the final completion session (merge of
`complete/api`, `complete/dashboard`, `complete/public`, `complete/ops` into
`main`, followed by full build/test validation of all three packages).

Issues are classified Critical / High / Medium / Low. Resolved items are listed
first so the open list reflects only residual work. For the full per-item table
see `docs/FINAL_COMPLETION_MATRIX.md`.

## Resolved this session (merged + verified)

| # | Area | Problem (was) | Fix | Commit |
|---|------|---------------|-----|--------|
| R1 | API/RBAC | 23 legacy-cookie admin routes (CMS/config/coupon/banner/theme) had no role check | RBAC enforced via requireAdminRole on all of them | 63e42db |
| R2 | API/Audit | Legacy admin writes logged without operator/ip/ua | actor context threaded into audit on those routes | 63e42db |
| R3 | Commerce | Checkout trusted client-supplied shipping fee (tamper to 0) | Server recomputes shipping from free-delivery threshold/standard fee | 121f0ed |
| R4 | Tests/API | Order transition state machine untested | Added admin-orders-query transition test suite | 1546a7e |
| R5 | Tests/Web | Cart/checkout total math untested | Added store.totals test suite | 23db10c |
| R6 | Dashboard | Orphaned change-password card (dead-end on secret-link-only auth) | Removed the card | 7219c1b |
| R7 | Dashboard/A11y | CMS tab switcher used non-semantic buttons | Switched to accessible Tabs primitive | d8654d0 |
| R8 | SEO | WebSite SearchAction targeted `?search=` but listing reads `?q=` | Repointed SearchAction at `?q=` | 070569a |
| R9 | SEO | No BreadcrumbList structured data on public pages | Added BreadcrumbList to product/category/brand | 36fc594 |
| R10 | CI | freezone-api `test`/`routes:check` never ran in CI | CI api job now runs both | db78b48 |
| R11 | Deploy | Deploy not gated on lint/test/build | verify-api/verify-web gate deploy; deploy-web needs deploy-api | 185cdab |
| R12 | Ops | Backup cron weekly vs claimed 24h RPO | Backup cron now daily 03:00 UTC | 836fcdc |
| R13 | Security | Storefront served only Cache-Control headers | Added HSTS/X-Content-Type-Options/frame-ancestors/Referrer-Policy | 624b598 |
| R14 | Docs | Deployment/QA deliverables missing | DEPLOYMENT_CHECKLIST + QA_CHECKLIST added; remaining deliverables added this session | a46da23 + this session |

## Open issues

### Critical

| # | Area | Problem | Impact | Recommended fix | Files | Verify |
|---|------|---------|--------|-----------------|-------|--------|
| C1 | SEO/Sitemap | `sitemap.xml` emits `/products/{slug}`, `/products?category={slug}`, `/products?brand={slug}` with no locale; live routes are `/{locale}/product/{id}`, `/{locale}/category/{id}`, `/{locale}/brand/{id}` | Every sitemap entry redirects or 404s -> indexing is effectively broken for products/categories/brands | Regenerate the sitemap in the **API lane** to emit the live locale+id route forms (and reconcile with the slug decision in M4) | `freezone-api/src/app/api/public/sitemap.xml/route.ts` | Fetch `/sitemap.xml`, spot-check that emitted URLs return 200 on the storefront |

### High

No High-severity defects remain open. All previously-High items (RBAC/audit on
legacy routes, shipping tamper, SearchAction, BreadcrumbList, CI api tests,
deploy gating) were resolved this session (R1–R4, R8–R11).

### Medium

| # | Area | Problem | Impact | Recommended fix | Files | Verify |
|---|------|---------|--------|-----------------|-------|--------|
| M1 | Commerce/Delivery | Per-product `excludedProvinces` is never enforced at order time | A blocked province can still place an order for a restricted product | Align checkout city dropdown to the canonical 18-province taxonomy, then validate order city vs `excludedProvinces` server-side with a localized error code (cross-lane: storefront + API) | `freezone-api/src/app/api/public/orders/route.ts`; `schema.prisma`; `freezone-web/.../checkout/page.tsx` | Place order to an excluded province -> expect rejection |
| M2 | SEO/Prerender | Category/brand landing pages are not prerendered | Crawlers/unfurlers get only generic index.html meta for those pages | Emit category/brand shells in `prerender.mjs` (coupled to C1 sitemap rework + M4 slugs) | `freezone-web/scripts/prerender.mjs` | `dist/` contains category/brand HTML shells with page-specific meta |
| M3 | SEO/Migration | Next.js storefront is a 3-file placeholder; Vite+prerender is the de-facto SEO path but undocumented | Architectural ambiguity; risk of duplicated effort | Write an ADR recording "Vite+prerender is the SEO path; Next storefront is paused" (or commit to the migration) | `freezone-storefront/src/app`; `docs/adr/` | ADR exists and is linked from README |
| M4 | SEO/URLs | Category/brand routes use opaque ids, not human/SEO slugs; inconsistent with sitemap | Weaker SEO; route/sitemap mismatch | Introduce slug resolution + id redirects across nav/ProductCard/landing CTAs + sitemap (high regression surface, plan as one change) | `freezone-web/.../landing/CategoryLandingPage.tsx` and links | Slug URL resolves; legacy id URL 301s |
| M5 | Commerce/Payments | ZainCash/FastPay not implemented or feature-flagged; not documented-as-flagged | No additional payment methods; unclear status | Add site-config feature flags + payments doc; keep gateways off by default (no fake success — already compliant) | `freezone-web/.../checkout/page.tsx`; site-config | Flag off -> only COD/handoff shown |
| M6 | Tests/A11y infra | vitest env is `node`, no jsdom; zero React component/a11y unit tests | Focus-trap/label/Escape regressions unguarded by unit layer | Add a jsdom vitest project + @testing-library deps (separate from the green node run) | `freezone-web/vitest.config.ts` | Component test renders + asserts ARIA |
| M7 | Tests/E2E | Playwright installed but no smoke/a11y specs | No end-to-end regression safety net | Add storefront/dashboard/RTL/404/a11y specs + CI job (web lane authors specs, OPS wires CI) | `freezone-web/package.json` | `playwright test` runs specs green |
| M8 | Tests | PC-builder rules and web coupon-service untested | Logic drift risk (web coupon copy diverges from tested API copy) | Add node tests for pc-build warnings/psu/filters and web coupon-service (or extract a shared module) | `freezone-web/src/lib/pc-build/*`, `lib/coupon-service.ts` | `npm test` includes new suites |

### Low

| # | Area | Problem | Recommended fix | Files |
|---|------|---------|-----------------|-------|
| L1 | API/Validation | No Zod; coupon-create ranges weakly validated | Add Zod (or tighten manual) on coupon create/update | `freezone-api/src/app/api/admin/coupons/*`; `lib/coupon-service.ts` |
| L2 | Commerce | `paymentMethod` accepted verbatim, no allowlist | Validate against `{cod, store_pickup, ...}` server-side | `freezone-api/src/app/api/public/orders/route.ts` |
| L3 | Commerce | Shipping is a flat global threshold+fee; city dropdown lists 4 of 18 provinces | Per-province fee rules + full province list (ties into M1) | `checkout/page.tsx`; `lib/site-public.ts` |
| L4 | A11y | Storefront ConfirmDialog lacks Tab focus trap (dashboard Modal has one) | Add the dashboard focus-trap hook to ConfirmDialog | `components/ui/ConfirmDialog.tsx` |
| L5 | Web UI | ~28 inline `1fr 1fr` page grids not responsive on phones | Add a min-width/auto-fit utility or media queries for page form grids | Profile/Design/Settings/Coupons + cms tabs |
| L6 | Tests | `trackPublicOrder` error-mapping untested | Add fetch-mocked test for 404/429/bad-json | `lib/order-tracking.ts` |
| L7 | API/Schema | Drift not asserted (`migrate diff` needs a DB) | Run `prisma migrate status`/`diff` against staging in a DB-enabled job | `prisma/` |
| L8 | Security | CORS fallback includes localhost even in prod (minor); rate limits in-memory per-process | Drop localhost fallback in prod; move rate limits to shared store if scaled | `freezone-api/src/server.ts`; `lib/rate-limit.ts` |

## Notes

- No Prisma migration was introduced by the merged branches; `prisma generate`
  is clean and all 31 existing migrations remain.
- The single Critical (C1) and the M1 delivery-restriction gap are both
  **cross-lane** (API sitemap / province taxonomy) and were intentionally left
  for a dedicated change rather than a partial, risky pass. See the next-session
  handoff: `docs/NEXT_SESSION_HANDOFF.md`.
