# SPRINT_STATUS — Mission item × verified status

Date: 2026-06-11 · Branch `feat/global-launch` @ 6bc32d7 · Produced by an
**independent code-level verification** (5 verifiers + coverage critic, 65 items,
evidence = file/line reads, prior reports treated as claims). Full evidence in the
verification transcript; assumption ids reference `ASSUMPTIONS.md`.

Legend: ✅ DONE · ≈ DONE-EQUIVALENT (met via documented assumption) · ◐ PARTIAL · ✗ MISSING

## P0

| Mission item | Status | Notes |
|---|---|---|
| Auth/RBAC (admin login phone/email+password, guards on every /api/admin/*, lockout, audited failures) | ✅ | 198 guard call sites verified by sampling; direct login fails closed in prod |
| JWT ~15m + refresh | ≈ A-2 | Revocable DB sessions (7d admin / 30d customer, fixed expiry — *stricter* than A-2's "sliding" wording, corrected this pass) |
| bcrypt ≥10 | ≈ A-4 | scrypt N=16384 r=8 p=1, timing-safe |
| Hardened /admin (login screen, lazy bundle, products/categories/orders mgmt) | ✅ | Route-hijack regression guarded by e2e |
| Admin noindex (X-Robots-Tag, robots, sitemap exclusion) | ✅ | |
| Catalog + product pages (gallery, specs, sale, stock, warranty, qty, related) | ✅ | |
| Category tree §4B | ◐→≈ A-15 | All children seeded EXCEPT Components/Monitors/Printers/CCTV stay top-level (live-prod safety; now formally logged) |
| Listing page (filters/sort/pagination/empty) | ◐ | **2 defects → fixed this pass:** /products had no breadcrumbs; DB-mode sort was per-page only |
| Cart (persisted, drawer + page) | ✅ | |
| Guest COD checkout (Iraqi phone, 18 governorates, server-trusted, transactional stock, FZ-#####) | ✅ | "Optional account" met via A-9 (silent session linking) |
| Order tracking (number+phone, rate-limited 10/min) | ✅ | |
| Stock restore on cancel | ✅ | Transactional + ledger + coupon decrement |
| SEO meta for crawlers | ≈ A-3 | Build-time prerender (static+product+category+brand+content × en/ar), Product/Breadcrumb/Org/WebSite JSON-LD, trailing-slash canonicals |
| sitemap.xml | ◐ | Missing 4 policy paths → **fixed this pass**; origin delivery via `_redirects` proxy ✅ |
| robots.txt | ◐ | `Disallow: /api` absent → **fixed this pass** |
| Real 404 status | ≈ A-3 | Impossible on static host + SPA catch-all; client 404 + noindex documented |
| i18n ar/en + RTL | ◐ | Bilingual + RTL complete (852=852 keys) BUT default was `en` and no persisted choice → **ar default + persistence fixed this pass**; 1 hardcoded string fixed |
| Security hardening | ◐ | All present except **storefront CSP → added (Report-Only) this pass**; zod on remaining ~30 admin writes scoped per A-16 |
| Content pages (Warranty/Shipping/Returns/Contact) | ✅ | Contact form posts for real |
| Seed data (≥24 products) | ✅ | 29 bilingual products, 87 tracked WebP images, idempotent, prod-guarded |
| Setting key/value | ≈ A-5 | Typed SiteConfig incl. per-governorate `shippingFeesJson` |
| Passing builds | ✅ | Re-proven in the Step-3 QA gate below |

## P1

| Item | Status | Notes |
|---|---|---|
| Dashboard charts/cards (revenue, by-status, low stock, pending reviews, latest 10, top products) | ✅ | |
| Reviews + moderation (+rating recompute) | ✅ | |
| Coupons (public validate + admin CRUD + usage stats) | ✅ | |
| Banners CRUD (HeroSlide/PromoBanner ≈ Banner HERO/STRIP) | ✅ ≈ | Model split documented in GAP_REPORT |
| Analytics events (all five, env-gated) | ✅ | |
| FAQ/About/Privacy/Terms | ✅ | |
| Related products · instant search suggestions (Arabic) | ✅ | |
| Footer composition | ◐ | Payment icons + categories column absent → **added this pass** |
| Hero carousel from DB · trust strip · brands strip | ✅ | |
| Accessibility sweep | ◐ | Spot checks positive; **axe pass added to e2e this pass**, criticals fixed |

## P2

| Item | Status | Notes |
|---|---|---|
| Customers block/unblock | ✅ | Built despite P2 |
| Audit log viewer | ◐ | Was all-admin → **SUPER_ADMIN-gated this pass** per mission §4D |
| WebP conversion | ◐→cut | New pipeline + demo 100% WebP; 43 legacy jpg/png accepted as-is (A-17) |
| Playwright suite | ✅ | 16 specs committed + README (not in CI — needs DB+browser job) |
| Maintenance mode | ✅ | Toggle + storefront maintenance screen |
| USD dual pricing display | ◐ | `priceUsd` never displayed → **secondary ~$ display added this pass** |

## Foundations fine print

| Item | Status | Notes |
|---|---|---|
| SUPER_ADMIN seed from ADMIN_PHONE + ADMIN_PASSWORD | ◐ | `ADMIN_PHONE` ✅; password var was `DASHBOARD_SEED_PASSWORD` only → **ADMIN_PASSWORD alias added this pass** |
| Login rate limit IP+phone 5/15min | ≈ A-2 | 5/10min per-IP + 5-fail/15min per-account lockout (net stricter) |
| react-helmet-async | ✅ | Equivalent DOM-upsert Seo (React-19 rationale in code) |
| zod on every endpoint | ◐→≈ A-16 | All critical public writes + new admin routes zod'd; highest-risk admin writes added this pass; remainder manual-behind-RBAC accepted |
| .env.example completeness | ◐→≈ A-14 | ALL `.env*` paths edit-blocked by session permission policy; additions parked in `docs/ENV_VARS_GLOBAL_LAUNCH.md` (owner copies in) |
| npm audit | ✅ recorded | 0 critical anywhere; web 2 high (react-router server-runtime vectors, unused by static SPA); api 3 moderate (qs); multer 1.x deprecated, advisory-free |
