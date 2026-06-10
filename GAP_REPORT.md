# GAP_REPORT — FreeZone Global Launch Sprint

Date: 2026-06-10 · Branch: `feat/global-launch` · Produced by Phase 0 read-only audit
(8 parallel auditors + completeness critic, with live verification against
`freezone-iq.com` and `freezone-website.fly.dev`).

This report maps the mission requirements against verified reality. **The codebase is
far more complete than the mission brief assumes** — agents must close the specific
gaps below and must NOT rebuild the listed working systems.

---

## 1. Architecture facts (verified)

| Fact | Reality |
|---|---|
| Monorepo | npm, NO workspaces. `freezone-api` (Express + Prisma 6 + PostgreSQL, Fly.io), `freezone-web` (Vite 7 + React 19 + RR7 SPA, Netlify static), `freezone-storefront` (Next.js — 3-file abandoned scaffold, not deployed) |
| Production HTML | **No server renders HTML.** Netlify serves static SPA + build-time prerendered shells (`freezone-web/scripts/prerender.mjs`, postbuild): 10 static routes + ≤500 products × en/ar with full meta + JSON-LD. Category/brand/search pages get the bare `<title>Freezone</title>` shell |
| Netlify config | **Root `netlify.toml` is DEAD CONFIG** — deploy uses `nwtgck/actions-netlify` manual API deploy which ignores it. Live site has NO sitemap at origin (`/sitemap.xml` returns HTML), NO custom security headers. Fixes must ship as `_redirects`/`_headers` files in `freezone-web/public/` |
| API | 107 auto-mounted route modules, helmet + CORS allowlist + targeted rate limits, JSON-only. `/health` + Fly checks. Migrations run on machine boot (no release_command) |
| Admin | Lives at **`/dashboard`** (`/admin` → redirect). Passwordless direct entry (commit 06f25c6, gated only by `ADMIN_DIRECT_LOGIN=true` — including production). Email+password backend login still works but has no UI. RBAC: 3-tier AdminRole, 198 guard call sites / 79 route files. scrypt hashing (not bcrypt). DB-backed revocable opaque sessions (deliberately chosen over JWT) |
| Auth docs | `deploy.env.example` + `docs/SECURITY_REVIEW.md` describe REMOVED fail-closed gates (`ADMIN_DIRECT_LOGIN_PRODUCTION_ACK` etc. appear nowhere in code) — stale |
| Schema | 25 models, 31 linear migrations. Money = Int IQD. Append-only StockMovement ledger, transactional checkout decrements. Rich extras (variants, EAV classification, CMS, import batches) that must not be broken |
| Seeds | `seed.ts` is wipe-and-reseed (prod-guarded), seeds categories/CMS/config but **zero products**. `delete-all-products.ts` has NO production guard. Real catalog comes from gated globaliraq importers |
| CI | `ci.yml` covers all 3 packages. **Root `npm run ci` omits API tests + routes:check that the deploy gate runs.** Deploy: push to main → verify → Fly → Netlify (auto!) |

## 2. Required vs Exists vs Missing vs Partial

### SEO & discoverability (Agent A scope)
| Requirement | Status | Reality / gap |
|---|---|---|
| Per-route server meta injection | **Partial** | Build-time prerender covers static + product routes only. No runtime server exists to hook — extend prerender instead (decision §3.2) |
| Product JSON-LD, BreadcrumbList, Organization/WebSite | **Exists** | Prerender + runtime `Seo`/`*JsonLd` components, verified live |
| Category/brand page prerender | **Missing** | Known gap (handoff M2/M4): in sitemap but served as bare shell |
| sitemap.xml | **Broken at origin** | API route exists + correct; `freezone-iq.com/sitemap.xml` serves SPA HTML because the proxy rule lives in dead config. robots.txt advertises the broken URL |
| robots.txt | **Exists** | `freezone-web/public/robots.txt`; needs nothing except its sitemap URL to start working |
| hreflang/canonical/OG/Twitter | **Exists** | In prerender + runtime; verify trailing-slash consistency (Netlify 301s `/en/product/194` → `…/194/`) |
| Real HTTP 404 for unknown slugs | **Missing** | Netlify catch-all returns 200 always; unknown product/category client-redirects to /products. Static hosting limits options (see §3.2) |
| Security headers / X-Robots-Tag on admin | **Missing live** | Zero custom headers in production (dead config). Must ship `_headers` |
| Prerender robustness | **Broken-ish** | Exits 0 on API failure — deploy can silently ship zero product pages |

### Catalog (Agent B scope)
| Requirement | Status | Gap |
|---|---|---|
| Category tree | **Partial** | 17 seeded categories. **No Networking category**; seed spotlight links to nonexistent `cat=network`; most seeded categories lack `nameAr` |
| Category page: grid/filters/sort/breadcrumbs/empty | **Exists** (rich) | **No pagination UI** — server paginates (48/page) but client never pages: filtered views silently truncate |
| Product page | **Exists** (polished) | Gaps: no qty selector (always adds 1), **no reviews UI**, variants display-only |
| Search + Arabic + suggestions | **Exists** | Debounced combobox, backend-wired. Leave alone |
| Reviews (model + submit + approved display) | **Missing entirely** | No Review model. `Product.rating` defaults to fake 4.5. `ProductComment`/review-queue are internal admin workflow — NOT customer reviews |
| ≥24 seed demo products | **Missing** | `PRODUCTS = []`. Fresh envs render an empty store |

### Commerce (Agent C scope)
| Requirement | Status | Gap |
|---|---|---|
| Cart (zustand + localStorage + page) | **Exists** | **No cart drawer** (store has `isOpen`/`toggleCart`, nothing renders it) |
| Guest COD checkout end-to-end | **Exists** (production-grade) | Server-priced, transactional stock + ledger, coupon revalidation, province exclusions, FZ-#### numbers |
| Iraqi phone validation (07XXXXXXXXX) | **Missing** | Client + server check non-empty only |
| Governorate dropdown (18) | **Exists** | Canonical `iraq-provinces.ts`, bilingual, shared codes |
| Per-governorate shipping fees | **Missing** | Flat `standardShippingFee` + `freeDeliveryThreshold` only |
| Coupon apply/validate | **Exists** | Server-side, inside order tx. Leave alone |
| PaymentProvider abstraction + ZainCash/QiCard/FIB adapters | **Missing** | `paymentMethod` is free-form string stored verbatim (no allowlist); ZainCash/QiCard are display-only wallet IDs settled via WhatsApp |
| `Order.paymentStatus` (UNPAID/PAID/REFUNDED) | **Missing** | No field at all — admin cannot record payment reconciliation |
| Order confirmation + tracking (number+phone) | **Exists** | Rate-limited, sanitized. Leave alone |
| Checkout error honesty | **Broken** | On network failure order saves device-locally and still shows success; `DELIVERY_RESTRICTED` falls through to generic error |

### Admin (Agent D scope)
| Requirement | Status | Gap |
|---|---|---|
| Admin at `/admin` with phone+password login | **Missing** | Admin is at `/dashboard`; login is passwordless direct entry; AdminUser has email only (no phone column) |
| Production protection | **Missing** | `ADMIN_DIRECT_LOGIN=true` alone opens SUPER_ADMIN in production (deliberate at the time; today's mission reverses it) |
| Products/Categories/Coupons/Banners/Media/Users/Audit | **Exists** (rich) | 10-tab bilingual product editor, tree+attribute builder, CSV import/export. Leave alone |
| Orders mgmt | **Exists** | Missing only: **paymentStatus toggle** (needs schema field) |
| Dashboard home | **Partial** | Rich KPIs/charts exist; missing latest-orders list, orders-by-status card, pending-reviews card |
| Customers area | **Missing** | No customer model at all |
| Review moderation | **Missing** | No customer-review model |
| Settings: per-governorate fees, flags | **Partial** | SiteConfig editor exists incl. maintenance mode; no per-province fees, no payment feature flags |
| Arabic-first | **Partial** | Fully bilingual + RTL, but defaults to `en` |
| Admin bundle splitting | **Partial** | Pages lazy, but admin shell ships in the main storefront bundle |

### Content & UX shell (Agent E scope)
| Requirement | Status | Gap |
|---|---|---|
| Shipping/Returns/Privacy/Terms | **Exists** | Real bilingual copy (`lib/policy-content.ts`) |
| About / Contact | **Partial/Broken** | Hardcoded English (violates i18n rule). **Contact form is fake** — `toast.success` + discards input, while `POST /api/public/contact` exists, rate-limited + audited, feeding the dashboard inbox |
| Warranty / FAQ pages | **Missing** | Footer aliases them to /returns and /contact |
| Header/footer/mega-menu/mobile nav/404/skeletons | **Exists** | Footer/menu link fixes only |
| Newsletter form | **Broken** | Fake success, input discarded |
| WhatsApp | **Exists** (deep) | FAB + checkout handoff with prefilled order. Leave alone |
| Customer accounts | **Broken (deceptive)** | Live fake phone+OTP login: any phone + any code "logs in" client-side. Zero backend. Must become real auth or be removed — mission §3.2 says real |

### Security / Perf / Analytics / Ops (Agent F scope)
| Requirement | Status | Gap |
|---|---|---|
| helmet/CORS/rate-limits/upload validation/error shape | **Exists** | Magic-byte uploads, parameterized-only raw SQL, allowlist CORS. Gaps: no global public-GET limit, no full CSP, multer 1.x (deprecated line) |
| zod on all inputs | **Partial** | Exactly 1 file uses zod; manual validation is strong on orders path, weaker elsewhere |
| Compression + cache | **Partial** | No compression middleware on API (full-catalog bootstrap JSON uncompressed + no-store); hashed `/assets/*` lack immutable headers; production sourcemaps published (`sourcemap:true`) |
| Code splitting / images | **Exists** | Extensive. Leave alone |
| GA4 + Meta Pixel + ecommerce events | **Missing entirely** | Zero analytics anywhere |
| Health/logging/Sentry | **Exists/Partial** | `/health` + Fly checks; API Sentry shim real (env-gated); web Sentry absent; logging opt-in JSON |
| Root `npm run ci` parity with deploy gate | **Partial** | Omits API tests + routes:check |

## 3. Sprint decisions (locked)

### 3.1 Admin auth — reversal acknowledged
Today's mission + today's CLAUDE.md explicitly require `/admin` + phone+password login,
reversing the documented owner decision of 06f25c6 (passwordless entry). We implement
the **mission**: canonical `/admin/*` routes (with `/dashboard/*` → `/admin/*` redirects),
restored login UI (phone or email + password), `AdminUser.phone` column, login audit
events. `ADMIN_DIRECT_LOGIN` remains for **non-production only** (fail-closed 403 in
production). We keep the existing **DB-backed revocable sessions instead of JWT**:
instant revocation, lockout mid-session, and session attribution are strictly stronger
than stateless JWT; swapping token formats adds risk with no security gain
(→ ASSUMPTIONS.md A-1, A-2).

### 3.2 SEO — extend prerender, don't invent a server
No runtime server serves HTML and introducing one mid-sprint would risk the working
deploy. We extend `prerender.mjs` to category/brand routes, ship `_redirects`
(sitemap + uploads proxies, SPA catch-all) and `_headers` (security headers, noindex
for /admin + /dashboard, immutable assets) in `freezone-web/public/`, and harden
prerender (fail deploy on zero products). Real HTTP 404 for arbitrary unknown slugs is
**not achievable on static Netlify with an SPA catch-all** — documented as a known
limitation with mitigations (client 404 + noindex + prerendered real routes)
(→ ASSUMPTIONS.md A-3).

### 3.3 Schema — one additive migration
`Review`, `Customer` (+ `CustomerSession`), `Order.paymentStatus` + `Order.customerId`,
`AdminUser.phone`, `SiteConfig.shippingFeesJson` (per-province map keyed by canonical
codes, fallback to flat fee). String-enum convention follows the existing codebase
style. No destructive changes; no renames of HeroSlide/PromoBanner/SiteConfig.

### 3.4 Honesty fixes are P0
Fake contact form, fake newsletter, fake OTP login, silent local-save "success" on
checkout network failure — deceptive surfaces get fixed before any new feature work
ships in the same area.

## 4. Out of scope (already working — DO NOT TOUCH)
Checkout pricing/stock/coupon engine, order state machine + cancel-restock, importer
system, classification EAV, CMS builder, media library, product editor, search,
WhatsApp integration, prerendered product meta, dashboard UI kit, backup workflow.

## 5. P2 deferrals (cut-line, per mission §7)
Wishlist/compare backend persistence, PC-builder changes, WebP seed-image conversion,
Playwright suite expansion, USD dual pricing, web Sentry, multer 2.x upgrade (if it
fights back), Next.js storefront (abandoned — ADR to be written).
