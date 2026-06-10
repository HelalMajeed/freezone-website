# MISSION: FreeZone (freezone-iq.com) — Full Gap-Closure Sprint (Multi-Agent)

> Canonical copy of the sprint mission. This spec was delivered inline to the
> 2026-06-10 and 2026-06-11 runs; materialized here verbatim on 2026-06-11 so
> audits and subagents reference one stable document (ASSUMPTIONS.md A-13).

Mission: take this e-commerce site from its current state to a launch-ready,
globally presentable electronics store, closing every gap listed below, covering
BOTH the customer-facing storefront AND a complete admin dashboard.

## 0. Non-negotiable ground rules
1. Inspect before you touch. Phase 0 is read-only.
2. Branch: `feat/global-launch` off the default branch. Commit per workstream.
3. Never break working code. Minimal diffs. No drive-by refactors.
4. Build gates before every commit; zero new type errors.
5. No invented secrets; env via `.env.example` documentation only.
6. No fake integrations — real adapters + clearly labeled stubs behind flags.
7. Assumptions log in `ASSUMPTIONS.md`; do not stall.
8. Bilingual by default (ar primary + RTL, en secondary); no hardcoded UI text.
9. Time discipline: cut P2 scope only, never P0.

## 3. Foundations
- 3.1 Prisma schema (extend, don't destroy; migration): User (phone-primary,
  role CUSTOMER|ADMIN|SUPER_ADMIN), Category (bilingual, parentId tree),
  Product (bilingual, specs Json, priceIQD, compareAt, stock, warranty, rating),
  Order (orderNumber, guest-capable, governorate, status enum,
  paymentMethod COD|ZAINCASH|QICARD|FIB|CARD, paymentStatus UNPAID|PAID|REFUNDED,
  totals, coupon, notes), OrderItem (snapshots), Review (moderated),
  Coupon, Banner (HERO|STRIP), AuditLog, Setting (key/value JSON).
- 3.2 Auth & RBAC: phone+password (bcrypt ≥10), JWT access ~15m + refresh
  httpOnly cookie, logout invalidates; requireAuth + requireRole('ADMIN') on
  every /api/admin/*; login rate limit 5/15min/IP+phone; failures → AuditLog;
  SUPER_ADMIN seeded from ADMIN_PHONE + ADMIN_PASSWORD.
- 3.3 i18n: react-i18next ar (default) + en, switcher, <html lang dir> synced,
  persisted; keep /en /ar URL prefixes.
- 3.4 API_CONTRACT.md + zod validation on every endpoint.

## 4. Parallel agents
### A — SEO & Discoverability
Server-side meta injection per route (title/desc/canonical/OG/Twitter/hreflang
ar/en/x-default + JSON-LD: Product, BreadcrumbList, Organization, WebSite w/
SearchAction); dynamic /sitemap.xml from DB (products/categories/content, both
langs, lastmod); robots.txt (allow all, sitemap, Disallow /admin + /api);
react-helmet-async equivalent client-side; real 404 status for unknown slugs;
SEO_NOTES.md with post-deploy steps.

### B — Catalog
Bilingual category tree: Security & Surveillance (IP Cameras, DVR/NVR, WiFi
Cameras, Alarm Systems, Fingerprint & Attendance, Smart Locks, Intercom);
Computers (Laptops Business/Gaming/Everyday, Desktops & Builds, Components,
Monitors, Printers); Gaming (Consoles, Controllers, Accessories); Networking
(Routers, Access Points, Switches, Cables & Tools); Smart Home (Lighting,
Plugs & Switches, Sensors, Hubs); Power Solutions (UPS, Inverters, Lithium
Batteries, Solar, Converters); Mobiles & Accessories; virtual Deals/New/
Featured. Category page: grid, filters (brand/price/in-stock), sort,
pagination, empty states, breadcrumbs. Product page: gallery, specs table,
sale badge, stock, warranty badge, qty selector, add-to-cart, related,
approved reviews + submission. Search: backend across nameEn/nameAr/brand/sku,
debounced suggestions, Arabic input. Seed ≥24 realistic demo products with
local placeholder images.

### C — Cart, Checkout, Orders, Payments
Cart persisted (drawer + page, qty edit, remove, subtotal); guest checkout
(name, Iraqi phone 07XXXXXXXXX validated, 18-governorate dropdown, city,
address, notes, optional account); shipping fee per governorate from settings
(Baghdad 5,000, others 8,000 defaults); coupon apply/validate; PaymentProvider
interface (createPayment/verifyCallback/refund) — COD fully end-to-end,
ZainCash/QiCard/FIB/card as NotConfiguredError stubs disabled w/ coming-soon
badge; confirmation page with orderNumber; tracking page (orderNumber+phone,
rate-limited, no auth); transactional stock decrement + restore on cancel.

### D — Admin Panel (route: /admin, hardened by auth not URL secrecy)
Unauthenticated → login (phone+password); failed logins rate-limited +
audit-logged; role check server-side on every admin API; excluded from
sitemap, robots Disallow, X-Robots-Tag noindex; session expiry + logout.
Lazy admin bundle, RTL-aware, Arabic-first: dashboard home (revenue
today/7d/30d, orders by status, low stock, pending reviews, revenue chart,
latest 10 orders, top 5 products); products CRUD (bilingual, upload, inline
stock/price, activate/deactivate, delete-confirm); categories tree CRUD +
reorder; orders (filterable, detail, status transitions, payment status
toggle, internal notes, audit-logged); customers (list, history,
block/unblock); reviews moderation; coupons CRUD + stats; banners CRUD;
settings (per-governorate fees, contact info, feature flags, maintenance
mode); audit log viewer (SUPER_ADMIN).

### E — Content, Trust & UX Shell
Bilingual real copy: About, Contact (wa.me deep link, form → DB + admin
reads), Warranty Policy (2-year), Shipping & Delivery, Returns & Exchange,
FAQ (≥10 questions), Privacy, Terms. Global shell: header (logo, search,
lang switcher, cart count, account), category mega-menu/drawer, footer
(categories, content links, payment icons, socials, copyright). Homepage:
hero carousel, category tiles, Featured/New/Deals, trust strip, brands
strip. Custom 404, skeletons, error boundaries, empty states. Accessibility:
alt text, focus states, headings, contrast on #C90000.

### F — Security, Performance, Analytics
helmet w/ sane CSP, CORS locked, global + sensitive rate limits, zod on all
inputs, no raw SQL interpolation, upload restrictions, no stack traces in
prod, npm audit (fix criticals if low-risk); React.lazy for /admin + heavy
pages, lazy images w/ dimensions, compression, long-cache hashed assets,
build-size report; GA4 + Meta Pixel behind VITE_GA4_ID / VITE_META_PIXEL_ID
(no-op absent) tracking page_view, view_item, add_to_cart, begin_checkout,
purchase; /api/health, structured logging, complete .env.example.

## 5. Integration & QA
Merge all agent work; builds + lint green; migrations apply on fresh DB;
end-to-end smoke: browse → filter → product → cart → guest COD → confirm →
track; ar/en flips everywhere; /admin blocked → login → product create →
order status → review moderation; curl product URL has title/desc/JSON-LD;
sitemap + robots valid; wrong slugs → 404. Fix everything found.

## 6. Handoff
FINAL_REPORT.md (built per area, file map, env vars, run-local, deploy
checklist, limitations, P2 deferred); ASSUMPTIONS/GAP_REPORT/SEO_NOTES/
API_CONTRACT committed; clean final commit + PR-style summary.

## 7. Scope priorities
- **P0:** auth/RBAC; hardened /admin with products/categories/orders;
  catalog + product pages; cart + guest COD checkout; order tracking; SEO
  injection + sitemap/robots/JSON-LD; i18n ar/en + RTL; security hardening;
  content pages (Warranty/Shipping/Returns/Contact minimum); seed data;
  passing builds.
- **P1:** dashboard charts; reviews + moderation; coupons; banners CRUD;
  analytics events; FAQ/About/Privacy/Terms; related products; instant
  search suggestions.
- **P2:** customers block/unblock; audit log viewer UI; WebP conversion;
  Playwright suite; maintenance mode; USD dual pricing display.

## 8. Definition of done
Every P0 item works from a fresh clone (install → migrate → seed → run); an
admin fully operates the store from /admin; a customer completes a COD
purchase in Arabic and English without a broken page; a crawler fetching any
product URL receives meaningful HTML metadata.
