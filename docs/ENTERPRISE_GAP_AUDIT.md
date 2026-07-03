# FreeZone — Enterprise Global-Readiness Gap Audit (Sprint E0)

> **Ground-truth audit. Code + live production wins over status docs.**
> Produced 2026-07-03. Branch `claude/enterprise-global-readiness-audit` @ `a035460`
> (level with `origin/main`). Method: 5 parallel read-only code-audit passes over
> `freezone-api/` + `freezone-web/` + `.github/workflows/`, cross-checked against
> **live production HTTP evidence** (curl against `freezone-iq.com` /
> `freezone-website.fly.dev`). Nothing was modified during this audit.
>
> Rules honored: no claim of "complete/100%/enterprise-ready" without measured
> evidence; anything not confirmed from code or live is marked **UNVERIFIED**.

---

## 1. Verdict (honest)

FreeZone is a **genuinely well-built, shipped store** — the commerce spine, auth,
upload/SSRF hardening, import pipeline, and admin operability are strong (see §5).
It is **NOT yet enterprise/global-ready**. Four blocker classes stand between the
current state and the CLAUDE.md success targets:

1. **Performance** — the storefront is a pure client-rendered SPA with no
   above-the-fold server render; mobile home Lighthouse was ~0. *(measured code
   evidence; a fresh Lighthouse run is still owed — see UNVERIFIED)*
2. **SEO crawl hygiene** — unknown **category/brand** URLs return **HTTP 200
   soft-404** in production (live-confirmed). Violates the `categories/brands:
   real 404` success target.
3. **Disaster recovery** — the daily "backup" may be a green-but-empty run; there
   is **no tested restore drill**; the API is a **single machine, single region,
   auto-stop** (availability SPOF).
4. **Trust/observability hardening** — CSP is Report-Only (not enforced), error
   monitoring/uptime alerting is unconfirmed, and a few auth edge-cases fail open
   by default (prod-mitigated only by a boot guard).

None of these require a rewrite. They are targeted, sprint-sized fixes.

---

## 2. Live production evidence snapshot (2026-07-03)

Real HTTP probes (not claims):

| Probe | Result | Meaning |
|---|---|---|
| `GET /en/product/99999999/` | **404** | product soft-404 fix **is live** ✅ |
| `GET /ar/product/99999999/` | **404** | product soft-404 fix live (both locales) ✅ |
| `GET /en/category/zzz-nope-xyz/` | **200** | **category soft-404 BUG (live)** 🔴 |
| `GET /en/brand/zzz-nope-xyz/` | **200** | **brand soft-404 BUG (live)** 🔴 |
| `GET /` home headers | `Content-Security-Policy-Report-Only: …` | CSP **not enforced** 🟠 |
| `GET /robots.txt` | disallows `/admin`,`/dashboard`,`/api` + sitemap ref | correct ✅ |
| `GET /health` (Fly API) | `{"ok":true,"service":"freezone-api"}` | API healthy ✅ |
| `GET /sitemap.xml` | `200`, `application/xml`, 345 KB | sitemap live ✅ |

The presence of the edge-function-driven product 404 **and** `netlify.toml`-derived
headers on the live home page proves the site is served via **Netlify Git
integration** (which honors `netlify.toml` + `netlify/edge-functions/`), not the
`actions-netlify` directory upload. This resolves the "is the edge function even
deployed?" question: **yes**.

---

## 3. Master gap table (mandated schema)

Ordered by severity. IDs are stable references for the sprint plan (§7).
`Sev` = Critical / High / Medium / Low.

| ID | Area | Gap | Sev | Business impact | Evidence (file:line) | Files involved | Fix plan | Verification |
|----|------|-----|-----|-----------------|----------------------|----------------|----------|--------------|
| SEO-1 | SEO / Category+Brand 404 | Unknown category/brand slugs return **HTTP 200 soft-404** (client `<Navigate>` to /products); edge fn is product-only | **Critical** | Infinite crawlable soft-404 space; GSC "Soft 404"; crawl-budget + rank dilution for ~1500-product store | `CategoryLandingPage.tsx:78-80`, `BrandLandingPage.tsx:79-82`, `seo-product-404.ts:47-49` (path scope), **live: /en/category/zzz→200, /en/brand/zzz→200** | new `netlify/edge-functions/seo-catbrand-404.ts`; both landing pages | Edge fn scoped to `/:locale/category/*` + `/:locale/brand/*`, check slug vs cached bootstrap category/brand set, fail-open, return 404 + `x-robots-tag:noindex` | `curl -I /en/category/does-not-exist/` → 404; valid slug → 200; cart/checkout untouched |
| PERF-1 | Performance / render | Pure client-rendered SPA: prerender injects only `<head>`; `<body>` = empty `#root`. FCP/LCP block on ~306 KB gzip critical JS **+** cross-origin bootstrap fetch | **Critical** | Root cause of mobile home Lighthouse ≈0; blank screen seconds on Iraqi mobile; bounce/lost conversion | `dist/index.html:24-34` (empty root), `LocaleLayout.tsx:54-71` (runtime bootstrap), `prerender.mjs:108-115` | `prerender.mjs`, `LocaleLayout.tsx`, `main.tsx` | Inline critical CSS + skeleton hero into shell; embed per-locale shell (site/theme/home) as inline JSON so header/hero paint before network; evaluate SSG for home | Mobile Lighthouse re-run: FCP<1.8s, LCP<2.5s; waterfall paints before bootstrap XHR |
| OPS-1 | Ops / Backup (#44) | Daily "backup" primary path = Fly volume snapshot of `freezone-website-pg` via **app-scoped** `FLY_API_TOKEN` (may not reach PG app); offsite encrypted `pg_dump` inactive (`DATABASE_URL_PROD` unset) | **High** | Backup may be green-but-empty; effective DR = Fly auto snapshots only (5-day, single region, no offsite, no PITR) | `backup-database.yml:30,53-58`, `docs/SECRETS_CHECKLIST.md:10` (`DATABASE_URL_PROD ⚠️`), `docs/DISASTER_RECOVERY.md:12-17` | `backup-database.yml`, secrets | Prove token reach (`flyctl volumes list -a freezone-website-pg`); if fails, mint org-scoped token; set `DATABASE_URL_PROD`+`BACKUP_GPG_PASSPHRASE`; push dump to R2/S3 ≥30-day retention | Workflow run lists fresh `vs_…` snapshot **and** uploads `freezone-db-backup` artifact |
| OPS-2 | Ops / Restore drill | No evidence any restore was ever executed; docs describe a "quarterly drill" that references a one-off manual dump, not automated output | **High** | RPO≤24h / RTO≤4h unproven; first real restore happens live during an incident | `docs/BACKUP_RESTORE.md:60-67`, `docs/DISASTER_RECOVERY.md:44-45`; no drill log in `docs/runbooks/` | `docs/runbooks/`, restore workflow | Restore a real snapshot/dump onto scratch Fly PG; run `db:counts` + load a product; commit `docs/runbooks/dr-drill-2026-07-DD.md` | Committed drill log with row counts + restored-product curl |
| OPS-3 | Infra / Availability | API = **single machine, single region (iad), `min_machines_running=0`, auto-stop**; uploads on one volume | **High** | Cold-start latency; any machine/region incident = full store down, no redundancy; lost volume = all product images gone | `fly.toml:29-31,40-45,15,48-50`, `ops-fly.yml:107-117` (wakes VM before ssh) | `freezone-api/fly.toml` | `min_machines_running=1` (≥2 for HA); warm standby; CDN/object store for images; evaluate multi-region DB | `flyctl status` ≥1 always-on; p95 first-byte after idle drops |
| OPS-4 | Ops / Monitoring | Sentry wired but DSN-gated (**UNVERIFIED** set in prod); **no uptime monitor, no error-rate/downtime alerting**; `captureError` only at the top-level Express handler (route `jsonError` paths never reach Sentry) | **High** | Prod 500s/outages can go unnoticed until a customer reports; no MTTR clock | `observability/index.ts:24-42`, `server.ts:298-302` (sole call site), `db-route-error.ts:4-16`; `SECRETS_CHECKLIST.md:25` (`SENTRY_DSN` recommended) | `observability/index.ts`, `server.ts`, new uptime workflow | Set/confirm `SENTRY_DSN` on Fly; external `/health` uptime check + alerting; alert on Sentry error rate; capture in `jsonError` paths too | Test throw appears in Sentry; simulated downtime pages on-call |
| PERF-2 | Performance / LCP | LCP hero image not preloaded and **no `preconnect`** to API/image origin; hero URL only known after runtime bootstrap → fully serialized LCP chain | **High** | LCP element downloads last; caps performance score even though `<img>` attrs are correct | `HeroSlider.tsx:54-72,190`, `ResponsiveImage.tsx:66-68`; grep `preconnect|preload` → none | `prerender.mjs`, `dist/index.html`, `HeroSlider.tsx` | Emit `<link rel=preload as=image imagesrcset>` for first hero (URL known at build) + `<link rel=preconnect href=fly.dev crossorigin>` | DevTools: hero starts ~0ms; LCP = hero not text |
| PERF-3 | Performance / bundle | `framer-motion` (~41 KB gzip) modulepreloaded on **every** storefront page for nav/hero micro-animation (`PageTransition` already a no-op) | **High** | ~41 KB parse/exec on every first paint for non-essential motion; LCP/TBT cost | `dist/index.html:29`, `NavBar.tsx:19`, `HeroSlider.tsx:6`, `PageTransition.tsx:5-7` | `NavBar.tsx`, `HeroSlider.tsx`, `vite.config.ts` | Replace with CSS transitions, or `LazyMotion`+`m`, or lazy below-fold; remove `vendor-motion` from eager preload | Rebuild: `vendor-motion` no longer modulepreloaded; TBT drops |
| CMX-1 | Conversion / mobile PDP | **No sticky mobile add-to-cart**; buy buttons inline in info column only | **High** | Suppresses mobile conversion (primary market); explicit E4 target | `ProductDetailClient.tsx:275-299`; no sticky/fixed rule in `productDetail.module.css` | `ProductDetailClient.tsx`, `productDetail.module.css` | Mobile-only sticky bottom bar (price + Add), appears when inline CTA scrolls out; offset above bottom dock | Mobile: scroll to reviews → sticky CTA adds correct qty |
| PERF-4 | Performance / split | `HomePage`+`ProductsPage`+`ProductDetailPage` are **static** imports in the 522 KB entry chunk (all other routes lazy) | Medium | Home visitor downloads listing+PDP code as dead weight; inflates first-paint chunk | `App.tsx:7-9` vs `App.tsx:12-31` (rest lazy); entry 522,257 B / 169 KB gzip | `src/App.tsx` | `React.lazy` `ProductsPage`+`ProductDetailPage` (keep Home eager) | Rebuild: entry shrinks, new PDP/listing chunks appear |
| SEC-1 | Security / CSP | Full resource CSP ships as **`Report-Only`**; API sets `helmet({contentSecurityPolicy:false})` — only `frame-ancestors 'none'` enforced | Medium | No CSP containment layer if an XSS/injection vector slips past sanitization on session-bearing storefront | **live home header `CSP-Report-Only`**, `_headers` ~L27, `server.ts:223-227` | `freezone-web/public/_headers`, `server.ts` | After reviewing violation reports, promote `_headers` CSP to enforced; keep allow-list | `curl -I /` shows enforced `Content-Security-Policy`; no console CSP breakage |
| SEC-2 | Security / auth | `adminPasswordMatches()` returns **true for any input** when `ADMIN_REQUIRE_PASSWORD!="true"`; `getAdminPassword()` falls back to literal `"changeme2024"` | Medium (prod-mitigated) | Fail-open legacy admin login in any env where the prod boot guard's semantics don't apply | `admin-session.ts:105-122`; mitigation `admin-secrets.ts:36-49` | `admin-session.ts` | Fail closed (return false when no password configured); remove `changeme2024` literal | Unit: `adminPasswordMatches("x")`→false when unset |
| SEC-3 | Security / RBAC | `requireSuperAdminRead` returns early for `legacy`/`system` actors with **no role check**, yet guards user-mgmt **POST/PATCH/DELETE** (create/delete admins) | Medium | Legacy-cookie holder (via SEC-2 shared pw) could create/delete SUPER_ADMINs despite "legacy=read-only" design | `admin-auth.ts:56-64`, `dashboard/users/route.ts:39`, `dashboard/users/[id]/route.ts` | `admin-auth.ts`, users routes | Split `requireSuperAdminMutate` that rejects `kind==="legacy"`; use on mutations | Legacy cookie → 403 on `POST /api/dashboard/users` |
| SEC-4 | Security / CSRF | No anti-CSRF tokens; cross-site admin→API means CSRF defense rests solely on CORS allow-list + `SameSite` (prod cookie value UNVERIFIED) | Medium | If a mutation ever accepts non-preflighted content type or CORS loosens, admin actions become CSRF-forgeable | `server.ts:81-109` (CORS), `dashboard-auth.ts:133-152`; no CSRF code exists | `server.ts`, `dashboard-auth.ts` | Double-submit token or `Origin`/`Sec-Fetch-Site` assertion on admin mutations | Cross-origin `credentials:'include'` POST rejected; legit admin unaffected |
| SEO-3 | SEO / OpenGraph | No `og:image` on home, all brand pages, or categories without `img`; no default social image | Medium | Blank WhatsApp/Facebook unfurls (primary IQ channels); weak brand CTR | `HomePage.tsx:11-16`, `prerender.mjs:296-300,399-406,373`, `Seo.tsx:95-116` | `Seo.tsx`, `prerender.mjs`, `HomePage.tsx`, `BrandLandingPage.tsx` | Default branded 1200×630 fallback in `Seo.tsx`+`headBlock()`; brand logo as brand OG | View-source shells show `og:image`; FB/Twitter validators pass |
| SEO-4 | SEO / structured data | Prerendered (no-JS) pages emit **no Organization/WebSite** schema — runtime only | Medium | Weaker entity/knowledge-graph + no sitelinks-searchbox for first-pass/no-JS crawls | `LocaleLayout.tsx:136` (runtime), `prerender.mjs` (only Product+Breadcrumb), `StoreJsonLd.tsx:8-46` | `prerender.mjs`, `StoreJsonLd.tsx` | Emit static Organization+WebSite JSON-LD in `headBlock()` for every route | curl shell (no JS) → Organization+WebSite in Rich Results Test |
| SEO-5 | SEO / listing schema | Category/brand pages emit only `BreadcrumbList` — no `ItemList`/`CollectionPage` merchant-listing schema | Medium | Category/brand pages miss richer listing eligibility + weaker "what this page lists" signal | `CategoryLandingPage.tsx:93-101`, `BrandLandingPage.tsx:87-92`; no `ItemList` component | landing pages, `prerender.mjs`, new `ItemListJsonLd` | Add `ItemList`/`CollectionPage` of visible product URLs (runtime+prerender) | Rich Results Test on category URL → valid ItemList |
| SEO-6 | SEO / product schema | Prerendered Product JSON-LD is a subset of runtime (no `aggregateRating`/`model`); neither emits `priceValidUntil`/shipping/return | Medium | No-JS crawl misses review stars; Merchant "missing field" warnings; **verify ratings are genuine before emitting aggregateRating** | `prerender.mjs:241-263` vs `ProductJsonLd.tsx:20,30-38` | `prerender.mjs`, `ProductJsonLd.tsx` | Align prerender↔runtime; add `priceValidUntil` (+shipping/return); confirm ratings real | Rich Results Test PDP shell vs hydrated parity |
| CMX-2 | Accessibility | **No skip-to-content link** anywhere; `<main>` has no `id` | Medium | Fails WCAG 2.4.1; drags Lighthouse a11y below ≥95 min | `LocaleLayout.tsx:150`; empty grep for skip-link | `LocaleLayout.tsx`, `globals.css` | Visually-hidden-until-focus `<a href="#main">` first; `<main id=main tabIndex=-1>` | Tab from load → "Skip to content" → Enter jumps to main; axe passes |
| CMX-3 | Accessibility / mobile | Cart qty +/- buttons hard-coded `32×32px` (< 44 px min); PDP uses `--fz-touch-min:44px` correctly | Medium | Fat-finger mis-taps on highest-intent page; Lighthouse tap-target flag | `cart.module.css:158-162` vs `productDetail.module.css:446-451`, token `adaptive-density.css:37` | `cart.module.css` | Raise `.qtyBtn` (+`.removeItemBtn`,`.couponClearBtn`) to `var(--fz-touch-min,44px)` | Lighthouse tap-target passes on `/ar/cart` |
| CMX-4 | i18n | Hard-coded bilingual `locale==="ar"?…:…` strings bypass i18next (translated but drift-prone); one English-only alt in Arabic | Medium | Maintainability/consistency; one EN leak (gallery thumbnail alt) | `FilterSidebar.tsx:277,300,316,386-387`, `Footer.tsx:157,160`, `ProductDetailClient.tsx:219-230`, `ImageGallery.tsx:89` | those `.tsx` + `messages/{en,ar}.json` | Extract to i18n keys; localize thumbnail alt | grep: no user-facing inline `locale==="ar"?` literals remain |
| CMX-5 | Commerce / variants | `ProductVariant` UI is display-only — selection not wired to cart/checkout; `addItem` always adds base product/price; order payload has no `variantId` | Medium (latent) | The moment variants get real price/stock, shoppers can't buy the selected one — always base price | `ProductDetailClient.tsx:218-236,279`, `checkout/page.tsx:264-269`, `public/orders/route.ts:142-164` | PDP, `store.ts`, orders route, schema | Hide variant UI until wired, OR implement variant→cart line→server pricing/stock | Add-to-cart from variant reflects chosen price/SKU end-to-end |
| OPS-5 | Ops / images | Product images written only to local Fly volume; R2/S3 mirror is doc-optional, **not wired in code** | Medium | Volume loss = permanent loss of ~1500 products' imagery (re-import only recovery) | `import-external-image.ts:166-172`; `BACKUP_RESTORE.md:12,54-57` | `import-external-image.ts`, `admin-upload-image.ts` | Mirror uploads to S3/R2 on write (or scheduled sync) + CDN | Object in bucket after upload; image resolves after simulated volume wipe |
| OPS-6 | Admin / orders | No order **SLA/aging board** for orders stuck in pending/processing past threshold | Medium | Orders silently age past fulfillment SLA; no triage surface (E5 target) | grep `SLA|aging|overdue` in `OrdersPage.tsx`,`OverviewPage.tsx` → none | `OrdersPage.tsx`, `OverviewPage.tsx`, `admin-orders-query.ts` | Aging query (pending/processing > N h) + Overview SLA card + age-sorted board with breach badges | Board flags an artificially aged order |
| PERF-5 | Performance / cache | No `Cache-Control: immutable` for content-hashed `/assets/*` on Netlify (only `index.html` has a header) | Medium | Repeat visitors pay revalidation round-trips instead of cache hits | `netlify.toml:23-28` (only `/index.html`) | `netlify.toml` / `public/_headers` | Add `/assets/*` → `public,max-age=31536000,immutable` (safe: hashed names) | `curl -I` asset shows immutable; repeat load = disk cache |
| PERF-7 | Performance / CSS | Single ~36 KB gzip render-blocking stylesheet; no critical-CSS split | Medium | Blocks first paint on full sitewide CSS (much below-fold) | `dist/index.html:30`, `main.tsx:7-16` | `main.tsx`, `src/theme/*`, `vite.config.ts` | Inline above-fold critical CSS in shell; split/async non-critical layers | Lighthouse render-blocking audit clears main stylesheet |
| OPS-7 | Security / RBAC | `guardAdminMutate` defaults to **all three roles**; a `CATALOG_EDITOR` can trigger 100-product imports + bulk reprice/soft-delete/recat/rebrand (only bulk→PUBLISHED gated to manager+) | Medium-Low | Low-privilege editor can cause wide catalog/price changes or launch imports (mitigated by audit log + 200-id cap) | `admin-route-guard.ts:10,21-25`, `import/globaliraq/run-batch/route.ts:18`, `products/bulk/route.ts:137-140` | those files | Require `CATALOG_MANAGER`+ for import triggers + destructive bulk ops | Editor session → 403 on run-batch + bulk price ops |
| PERF-8 | Performance / fonts | Self-hosted Inter + 4 IBM Plex Arabic weights (~836 KB across variants) not preloaded | Low-Medium | FOUT/late-swap on above-fold text, worse for Arabic-first audience | `main.tsx:7-11`; 31 font files in `dist/assets`; no preload | `main.tsx`, `dist/index.html` | Preload the one above-fold weight per locale; confirm `font-display:swap` | Fonts start early; no CLS from swap |
| SEC-5 | Security / rate limit | In-memory, single-instance, **IP-only** limiter; login budget resets on every deploy; fragments if >1 machine | Low-Medium | Distributed/rotated-IP credential-stuffing weakly bounded (per-account DB lock partly mitigates) | `rate-limit.ts:1-11`, `rate-rules.ts:19-31` | `rate-limit.ts`, `rate-rules.ts` | Redis/Postgres-backed store when scaling >1; keep per-account lock | 2-machine load test → shared limit; account lock at 5 fails |
| SEC-6 | Security / validation | Zod on ~14/118 route files; most admin mutations parse `req.json() as {...}` ad-hoc (public checkout/register/login/reviews/contact ARE covered) | Low | Type-confusion/inconsistent 400 contracts on admin mutations (all auth-gated; no specific exploit found) | `grep -rl "from 'zod'"` → 14 of 118 | admin routes | Shared zod schemas for top ~20 admin mutation bodies | Malformed-body tests → structured 400 |
| SEO-7 | SEO / sitemap | Sitemap `STATIC_PATHS` omits `/pc-builder` + `/track-order` (both prerendered) | Low | PC-builder (a conversion path) discoverable only via internal links | `sitemap.xml/route.ts:22-33` vs `prerender.mjs:282-295` | `sitemap.xml/route.ts`, `prerender.mjs` | Add `/pc-builder` (decide `/track-order` index policy); derive both from one constant | `/sitemap.xml` contains `/pc-builder/` both locales |
| SEO-8 | SEO / robots | `noindex` on cart/checkout/account is runtime-only (not in no-JS shell; routes not prerendered) | Low | Small risk of thin/transactional pages crawled before JS noindex (not in sitemap) | `cart/page.tsx:105`,`checkout/page.tsx:549`,`account/page.tsx:87` etc. | `public/_headers` | `X-Robots-Tag:noindex` header blocks for `/*/cart/*`,`/*/checkout/*`,`/*/account/*` | `curl -I /en/checkout/` → `x-robots-tag:noindex` |
| OPS-8 | Deploy | `deploy-web` job runs `actions-netlify` with `production-deploy:true` (double-deploy/drift risk vs Git integration, or silent no-op if secrets unset); no automated rollback; `ci.yml` on every push | Low-Medium | Two publish paths can race/diverge; no one-click rollback lengthens incident recovery | `deploy-production.yml:105-112`, `ci.yml:3-5`; live headers imply Git integration is the real path | `deploy-production.yml`, `ci.yml` | Pick one web-deploy path; add documented/automated rollback (`flyctl releases`); scope CI push triggers | One Netlify deploy/merge; rehearsed rollback restores prior release |
| SEC-7 | Ops hygiene | `deploy.env.example` documents a prod passwordless "secret-link" login using vars (`ADMIN_DIRECT_LINK_TOKEN`, `…PRODUCTION_ACK`) that **exist nowhere in code** (code fails closed in prod) | Low | Misleads operators; risk of skipping proper password setup (not exploitable) | `deploy.env.example:16-22`; grep → 0 code hits; `admin-direct-login.ts:26-36` | `deploy.env.example`, `docs/ADMIN_DIRECT_ACCESS.md` | Update template to fail-closed reality; remove dead vars | Template review; prod direct-login → 403 |
| CMX-6 | i18n / tracking | Order-track page renders raw province **code** (`baghdad`) not localized label (`بغداد`) | Low | Minor polish/trust gap on an otherwise solid flow | `checkout/page.tsx:305-306`, `orders/track/route.ts:48`, `track-order/page.tsx:193` | `track-order/page.tsx` | Map code→label via `iraq-provinces` | Track `city=baghdad` on `/ar` → "بغداد" |
| PERF-9 | Performance / prefetch | `StorefrontPrefetch` prefetches 5 route **HTML docs** (near-identical SPA shells), not JS chunks — wastes mobile data for ~0 benefit | Low | Minor wasted data on metered mobile | `StorefrontPrefetch.tsx:7,12-23`, `navigation.tsx:68-78` | `StorefrontPrefetch.tsx` | Drop it, or prefetch actual route JS chunks | Network shows route chunks warmed, not duplicate shells |
| CMX-7 | i18n / SSR | `index.html` ships `<html lang="en">`; non-prerendered Arabic routes flash `lang=en`/LTR until JS (prerendered routes are correct) | Low | Brief RTL flash on non-prerendered `/ar` routes | `index.html:2`, `SetDocumentLocale.tsx:7-10`, `prerender.mjs:110` | prerender manifest | Ensure every indexable `/ar` route is prerendered | View-source `/ar/...` → `dir="rtl"` |

---

## 4. Coverage of the 20 mandated audit areas

Every area in CLAUDE.md §"Sprint E0" was inspected. Status:

| # | Area | Status | Key gap IDs |
|---|------|--------|-------------|
| 1 | Performance | **GAPS (Critical)** | PERF-1..9 |
| 2 | SEO | **GAPS (Critical)** | SEO-1 (crit), SEO-3..8 |
| 3 | Accessibility | GAPS | CMX-2, CMX-3 (+ a11y items) |
| 4 | Security | GAPS (hardening) | SEC-1..7 |
| 5 | Checkout | **GOOD (verified)** | — (server-trusted pricing, atomic stock) |
| 6 | Order tracking | GOOD | CMX-6 (minor) |
| 7 | Admin dashboard | GOOD | OPS-6 (SLA board), OPS-7 (RBAC) |
| 8 | Product quality | GOOD (tooling exists) | data-quality dashboard real |
| 9 | Category & brand pages | **GAPS (Critical)** | SEO-1, SEO-5 |
| 10 | Structured data | GAPS | SEO-4, SEO-5, SEO-6 |
| 11 | Sitemap & robots | GOOD | SEO-7, SEO-8 (minor) |
| 12 | Image optimization | GOOD (responsive done) | PERF-2, PERF-8 (delivery) |
| 13 | Mobile UX | GAPS | CMX-1, CMX-3 |
| 14 | Arabic RTL | GOOD | CMX-7 (minor flash) |
| 15 | English LTR | GOOD | — |
| 16 | Backups | **GAPS (High)** | OPS-1, OPS-5 |
| 17 | Restore drill | **GAPS (High)** | OPS-2 |
| 18 | Monitoring & error reporting | **GAPS (High)** | OPS-4 |
| 19 | Import system | GOOD (robust) | — (dedupe, re-host, SSRF, review queue) |
| 20 | Deployment workflows | GOOD | OPS-3 (infra), OPS-8 |

---

## 5. Verified strengths (do NOT "fix" — these are already good)

Confirmed from code (and live where noted). Regressing any of these is a red line.

- **Checkout is tamper-proof** — server-trusted pricing from DB (client price/name
  ignored), coupon re-validated, shipping recomputed server-side, total sanity
  check, qty≤999, **atomic stock decrement** (`updateMany … quantity gte`, rejects
  on oversell) + append-only `StockMovement` ledger, all in one transaction.
  (`public/orders/route.ts`)
- **Stock restore on cancel** — `admin/orders/[id]/cancel` restores stock via
  atomic `increment` + a `StockMovement reason:"order_cancelled_restore"` +
  `OrderStatusEvent`, in one transaction. (`cancel/route.ts:43-128`)
- **Guest checkout + COD** — no auth gate; `codProvider.isConfigured()` always
  true; honest fallback keeps cash on if methods API is unreachable.
- **Order tracking** — phone-gated (last-9 match), 404 on mismatch (no oracle),
  sanitized response (no address/email/notes), rate-limited.
- **Upload security** — content-based magic-byte sniffing (SVG/HTML rejected),
  server-random filenames (no traversal), 50 MB cap, sharp re-encode strips
  polyglots. **SSRF guard** blocks private/loopback/metadata, DNS-timeout bounded,
  **re-pins socket to resolved IP on every redirect hop** (closes DNS-rebind).
- **Auth** — argon2id (new) / scrypt (legacy), `timingSafeEqual`, DB-backed opaque
  revocable sessions, `HttpOnly`+`Secure` prod cookies, brute-force lock (5→15min).
  **Every** admin/dashboard mutation handler calls a guard (automated scan of all
  92 route files; only the 4 auth endpoints are guardless by design). Dev/direct
  passwordless logins **fail closed in production**.
- **Model-viewer is fully code-split** — the historical "~1 MB prime suspect" is
  **disproven**: `vendor-model-viewer` (288 KB gzip) is `lazy()`-loaded only on a
  3D-model product or `/pc-builder`; not modulepreloaded on the storefront.
- **Admin bundle fully isolated** from the storefront (one lazy boundary + pathname
  branch); admin-only heavy libs never enter the storefront entry.
- **#56 server-side listing + bootstrap trim landed** — bootstrap no longer ships
  the full catalog; listing/category/brand are server-paginated (real OOM + listing
  win). (`LocaleLayout.tsx`, `catalog-products-api.ts`)
- **Responsive images** — srcset 200/400/800/1600 WebP, lazy+async default,
  `priority`→eager/high, aspect-ratio reserves space (no CLS).
- **SEO foundations** — canonical trailing-slash **consistent** across prerender /
  Seo / sitemap; **hreflang reciprocal + x-default**; **prerender covers ALL
  products** (long-tail, not top-N); product JSON-LD well-formed + XSS-escaped;
  BreadcrumbList everywhere; **product soft-404 live** (verified 404); robots + noindex
  headers correct on `/admin`,`/dashboard`,`/api`.
- **i18n parity perfect** — `en.json` and `ar.json` both **871 keys, 0 missing, 0
  empty**; RTL applied + baked into prerender; global `:focus-visible` outline;
  descriptive alt text, decorative images `alt="" aria-hidden`.
- **Import pipeline robust** — 2-layer dedupe, 120 s per-product timeout,
  consecutive-failure halt, **images re-hosted locally** (never Shopify CDN final),
  spec auto-strip-retry, `PENDING_REVIEW` review queue, gated auto-publish.
- **Admin operability** — real Data-Quality dashboard (8 tabs: missing
  image/brand/price/specs, invalid filters, duplicates, legacy-specs), safe bulk
  actions (≤200 ids, state-machine, publish gated), order state-machine + audit
  trail surfaced in UI, RBAC consistent API↔UI.
- **Deploy gates real** — `deploy-api needs [verify-api, verify-web]`; single
  migration path (boot entrypoint only, no release_command race); `/health` + Fly
  checks every 15 s.

---

## 6. UNVERIFIED — needs owner/secrets/live tooling (do not claim either way)

1. **Lighthouse scores (current).** Cannot run Lighthouse in this session env.
   Prior run (2026-06-15): home 0 / listing 60 / product 73, best-practices 93,
   a11y 88-96. Perf work (#56) has since landed → **re-measure required** before any
   perf claim. Route: `lighthouse.yml` (CI) or PSI.
2. **`SENTRY_DSN` set in prod?** (OPS-4/SEC-5) — not in repo. `fly secrets list`.
3. **`DATABASE_URL_PROD` + `BACKUP_GPG_PASSPHRASE` set? Backup token reach?**
   (OPS-1) — run `backup-database.yml` / `flyctl volumes list -a freezone-website-pg`.
4. **Prod cookie `SameSite` value** (SEC-4) — cross-site topology implies `None`;
   confirm via `fly secrets` / a live `Set-Cookie` on admin login.
5. **Are product ratings genuine** (SEO-6) — confirm before emitting `aggregateRating`
   (Google policy).
6. **~309 DRAFT products** (prior note) — confirm current DRAFT count + triage need
   via admin Data-Quality dashboard.

---

## 7. Prioritized sprint plan (E1–E5) with exact files

Effort/risk are relative. "Live-risk" = touches production behavior; verify locally
first, ship on the branch → PR, never direct-to-main.

### Sprint E1 — Safety & Trust (do first) → `docs/ENTERPRISE_SAFETY_REPORT.md`
Highest-severity safety/trust items. Most are low-code / high-value.

1. **SEO-1 (Critical) category/brand real-404** — new
   `freezone-web/netlify/edge-functions/seo-catbrand-404.ts` (mirror the proven
   product edge fn, fail-open). *Low-risk, high-value; product 404 pattern already
   works live.*
2. **OPS-1 + OPS-2 backup reality + restore drill** — prove token reach; activate
   offsite dump; execute one restore onto scratch PG; commit drill log. *Owner
   secrets likely needed (UNVERIFIED #3).*
3. **OPS-4 monitoring** — confirm/set `SENTRY_DSN`; add external `/health` uptime +
   alert; capture in `jsonError` paths (`observability/index.ts`, `server.ts`).
4. **OPS-3 availability** — `fly.toml` `min_machines_running=1` (removes cold-start
   + SPOF; cheapest resilience win).
5. **SEC-1 CSP enforce** — after reviewing report-only violations, promote
   `public/_headers` CSP to enforced.
6. **SEC-2 + SEC-3 fail-closed auth** — `admin-session.ts` (no `changeme2024`,
   fail closed) + `admin-auth.ts` (`requireSuperAdminMutate`).
7. **SEC-4 CSRF** — `Origin`/`Sec-Fetch-Site` assertion on admin mutations.

### Sprint E2 — Performance 95+ → `docs/PERFORMANCE_REPORT.md`
No perf claim without a Lighthouse run (UNVERIFIED #1).

1. **PERF-1 (Critical)** inline critical CSS + skeleton + inline per-locale shell
   JSON in `prerender.mjs` so header/hero paint before the network bootstrap.
2. **PERF-2** hero `preload` + API `preconnect` in the prerender shell.
3. **PERF-3** remove `framer-motion` from eager path (CSS transitions / LazyMotion).
4. **PERF-4** `React.lazy` `ProductsPage`+`ProductDetailPage` (`App.tsx`).
5. **PERF-5/7/8/9** immutable asset cache headers, critical-CSS split, font preload,
   drop/fix `StorefrontPrefetch`.
6. Re-run `lighthouse.yml`; attach evidence.

### Sprint E3 — SEO & global discoverability → `docs/SEO_GLOBAL_READINESS_REPORT.md`
1. **SEO-4** static Organization+WebSite JSON-LD in prerender.
2. **SEO-5** `ItemList`/`CollectionPage` on category/brand.
3. **SEO-6** align prerender↔runtime product JSON-LD + `priceValidUntil` (confirm
   ratings genuine first).
4. **SEO-3** default OG image + brand OG.
5. **SEO-7/SEO-8** sitemap static paths + `X-Robots-Tag` for transactional routes.

### Sprint E4 — Conversion & trust → `docs/CONVERSION_TRUST_REPORT.md`
1. **CMX-1 (High)** sticky mobile add-to-cart.
2. **CMX-3** cart tap-target 44 px; **CMX-2** skip link (also a11y/E1-adjacent).
3. **CMX-5** decide variant strategy (hide vs fully wire).
4. **CMX-4/CMX-6** i18n string extraction + localized province label.
5. Audit existing warranty/delivery/return/WhatsApp/B2B-quote/trust-badge/compare
   surfaces (several already exist — inventory before building).

### Sprint E5 — Enterprise admin ops → `docs/ADMIN_ENTERPRISE_REPORT.md`
1. **OPS-6** order SLA/aging board.
2. **OPS-7** tighten mutate RBAC (manager+ for imports + destructive bulk).
3. **OPS-5** offsite image mirror (R2/S3 + CDN).
4. **SEC-6** zod schemas for top admin mutations; **OPS-8** single web-deploy path +
   rollback runbook; **SEC-5** durable rate-limit store (only if scaling >1 machine).

### Sprint E6 — QA & release → `docs/ENTERPRISE_RELEASE_REPORT.md`
Run `npm run ci` + per-package gates; verify AR/EN flows + 404s + sitemap + robots +
structured data + mobile; attach Lighthouse; PR ready for review.

---

## 8. Rollback & safety notes

- All work stays on `claude/enterprise-global-readiness-audit` (or child branches) →
  PR → owner review. **No direct push to `main`** for this phase.
- Every fix ships with: plan → implementation → verification → rollback note.
- Live-risk order: SEO-1 edge fn (fail-open, product pattern proven) and static
  config/headers are safest first; PERF-1 (prerender shell) and any DB/infra change
  (OPS-1/3) need local verification + a documented rollback before shipping.
- Red lines unchanged: no destructive DB ops, no secrets in code, no fake reports,
  no "100%/complete" without measured evidence.

---

*End of E0 ground-truth audit. Next deliverable on owner go-ahead: begin Sprint E1
(`docs/ENTERPRISE_SAFETY_REPORT.md`), starting with SEO-1 (category/brand real-404).*
