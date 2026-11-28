# ASSUMPTIONS — Global Launch Sprint (2026-06-10)

Production-grade assumptions made where the mission and repository reality diverge,
or where information was missing. Each is reversible; flag any you want changed.

## A-1 · Admin auth direction (reverses commit 06f25c6)
**Context:** Commit 06f25c6 (owner-requested at the time) removed password login UI and
made `/dashboard` passwordless when `ADMIN_DIRECT_LOGIN=true` — including production.
Today's mission + today's CLAUDE.md explicitly demand the opposite: admin at `/admin`
behind a phone+password login screen, "security comes from the auth layer."
**Assumption:** The newest instruction wins. We restore a credentialed login at
`/admin` (phone **or** email + password), and `ADMIN_DIRECT_LOGIN` becomes
**non-production only** (fail-closed `403` when `NODE_ENV=production`), preserving
local-dev convenience. Existing admins log in with their email until a phone is set.

## A-2 · DB-backed sessions instead of JWT
The mission asks for JWT access (~15m) + refresh tokens. The codebase already has
revocable, opaque, DB-backed sessions (hashed tokens, httpOnly/Secure/SameSite
cookies, lockout, rate limits) — deliberately chosen over JWT for instant revocation.
Swapping to JWT would *weaken* security (no mid-session revocation/lockout) and risk
breaking 79 guarded route files mid-sprint. **We keep DB sessions** for admin and use
the same pattern for the new customer accounts (`CustomerSession`). The mission's
intent (secure, expiring, revocable auth) is met: fixed expiry (7d admin / 30d
customer) + instant revocation. *(Corrected 2026-06-11: an earlier wording claimed
sessions "slide"; they do not — fixed expiry, which is stricter.)*

## A-3 · SEO approach: extend build-time prerender, no runtime HTML server
No server renders HTML in production (Netlify static + Fly JSON API). Introducing
Express HTML middleware would not be exercised by the real deploy path. We extend the
existing prerender (`freezone-web/scripts/prerender.mjs`) to category/brand routes and
fix delivery via `_redirects`/`_headers` in `freezone-web/public/` (the root
`netlify.toml` is verifiably dead config under the current `actions-netlify` deploy).
**Consequence:** real HTTP 404 for *arbitrary* unknown slugs is impossible on a static
host with an SPA catch-all; mitigated by client 404 + `noindex` + prerendered real
routes. Documented in SEO_NOTES.md.

## A-4 · Scrypt stays (mission says bcrypt ≥10)
Live hashing is scrypt (N=16384, r=8, p=1 — OWASP-acceptable) with timing-safe verify,
used by all existing admin hashes. Switching to bcrypt would add a dependency and a
dual-verify path for zero security gain. Customer accounts reuse the same helpers.

## A-5 · Per-governorate shipping fees live in `SiteConfig.shippingFeesJson`
A `{ provinceCode: feeIQD }` map keyed by the canonical 18 codes in
`src/lib/iraq-provinces.ts`, falling back to `standardShippingFee` for missing keys;
`freeDeliveryThreshold` still applies. Defaults seeded: Baghdad 5,000 IQD, all other
governorates 8,000 IQD (mission's suggestion). Editable in admin Settings.

## A-6 · Payment methods allowlist (existing stored values kept)
Server-side allowlist: `cod`, `zaincash`, `qicard`, `visa`, `master`, `store_pickup`
(set already stored by the live checkout — renaming would corrupt order history).
FIB is added as `fib` behind the adapter. ZainCash/QiCard/FIB/card adapters throw
`NotConfiguredError` unless their env keys are present; checkout shows them disabled
with a "coming soon" badge when unconfigured. COD and store-pickup are fully enabled.
`Order.paymentStatus` (`unpaid|paid|refunded`) is a new string field defaulting to
`unpaid`, following the codebase's string-enum convention (not DB enums).

## A-7 · Demo product seed is separate and additive
`prisma/seed.ts` is wipe-and-reseed and intentionally seeds zero products (production
catalog comes from the GlobalIraq importer). We add a **separate, idempotent**
`seed-demo-products.ts` (24+ bilingual products, local placeholder images) gated to
non-production, never wired into the default `db seed` chain that the entrypoint
might touch. Fresh local envs get a convincing store; production data is untouched.

## A-8 · `/dashboard` URLs keep working
Canonical admin path becomes `/admin/*`; all `/dashboard/*` URLs 301-redirect (client)
to their `/admin/*` equivalents so bookmarks, notification deep-links (`href:
/dashboard/orders/…`), and docs don't break. Server API paths (`/api/dashboard/*`)
are unchanged — only the frontend route prefix moves.

## A-9 · Customer accounts are optional, guest checkout untouched
Real phone+password register/login replaces the fake OTP UI. Orders link to a
`customerId` only when signed in; the existing guest flow (name+phone inline) is the
unchanged default. Wishlist/compare stay client-side (P2 for backend persistence).

## A-10 · No deployment from this sprint
`.claude-state.md` says deployment is performed by a human, and pushing `main`
auto-deploys via GitHub Actions. All work stays on `feat/global-launch`; FINAL_REPORT
includes the deploy checklist. Nothing is pushed to `main` by the sprint.

## A-11 · Iraqi phone format
`^07[0-9]{9}$` (11 digits) for customers and reviews, normalizing Arabic-indic digits
(٠٧…) and stripping spaces/dashes before validation. Admin login accepts email or
phone in one identifier field.

## A-14 · `.env.example` files cannot be edited from this environment
The session permission policy denies read/write on every `.env*` path, including
the example files. All new env vars are documented in
`docs/ENV_VARS_GLOBAL_LAUNCH.md`; the owner copies those blocks into
`freezone-api/.env.example` and `freezone-web/.env.example` (and should delete the
stale secret-link paragraphs in `deploy.env.example` that contradict A-1).

## A-15 · Category tree: four legacy top-levels not re-parented
Mission §4B nests Components/Monitors/Printers under Computers and the CCTV
family under Security & Surveillance. These slugs predate the sprint, carry live
products and live URLs, and re-parenting them would change live page composition
and homepage strips. They remain top-level siblings; all other mission children
(27) are seeded with `parentId`. Re-parent later via the admin Categories form +
redirects if desired (`docs/CATEGORY_TREE.md`).

## A-16 · zod scope on admin writes
Mission 3.4 says "zod on every endpoint". Every **public** write and every
**new** admin route is zod-validated; the highest-risk legacy admin writes
(coupons create/update, orders PATCH, products create) were formalized with zod
in the ship run. The remaining legacy admin writes keep their existing careful
manual validation — they all sit behind session+RBAC guards and audit logging,
and rewriting ~30 working routes mid-ship would violate the minimal-diff rule.

## A-17 · Legacy upload images stay jpg/png
The image pipeline (uploads + demo seed) is WebP end-to-end with responsive
variants. 43 pre-sprint committed files under `freezone-api/public/uploads/`
remain jpg/png; converting them requires touching production `ProductImage`
rows. Accepted as legacy (P2 cut per mission §7).

## A-18 · Storefront default language flipped to Arabic
Mission 3.3 and CLAUDE.md define Arabic as primary. The storefront previously
defaulted to `/en`; the ship run flips the root/unknown-path redirects and i18n
default to `ar`, persists the visitor's explicit language choice (localStorage)
and honors it on `/`. Existing `/en/*` URLs, prerendered shells, and hreflang
alternates are unchanged; `x-default` continues to point at the `en` variant
(international audience), which is an SEO judgment call, not an oversight.

## A-13 · MISSION.md materialized from the inline spec (2026-06-11)
The recovery run instructed "read MISSION.md at the repo root", but no such file
existed — the mission was only ever delivered inline (identically, twice). The
inline spec has been committed verbatim as `MISSION.md` so audits and subagents
reference one canonical document. If the owner's intended MISSION.md differed,
diff it against this file and re-run the SPRINT_STATUS audit.

## A-12 · Analytics env names
`VITE_GA4_ID` and `VITE_META_PIXEL_ID` (mission naming). Loaders are no-ops when
unset; events: `page_view`, `view_item`, `add_to_cart`, `begin_checkout`, `purchase`.

## A-19 · Phase-1 bootstrap trim — full catalog removed from storefront-bootstrap (2026-06-20, branch `perf/server-side-product-listing`)
`GET /api/ssr/storefront-bootstrap` no longer returns `catalog.products`. The
customer browser must never receive the whole catalog. Consumers were migrated
to lightweight server-driven data first, then `products` was deleted (the TS
compiler confirmed zero references). Decisions/assumptions:
- **Home rails** read capped server collections (`catalog.collections` —
  featured/newest/onSale ≤16/≤16/≤12 + bestSellers + `hasNew`) computed by
  `getHomeCollections` (60s-cached). Tabs/featured/PDP-related/landing/wishlist/
  compare browse via the paginated `/api/ssr/catalog/products`,
  `/api/ssr/catalog/products/by-ids` (id cap 100), and `/api/ssr/product/[id]`.
- **Brand badges** are now server-computed per category: `queryCatalogProducts`
  returns `brandCounts` (one index-only `groupBy`, by category membership only —
  matches the old client `collectBrandCounts`). `FilterSidebar` prefers them.
- **PC builder is a documented temporary exception:** it lazy-loads the full
  lean catalog from the new `GET /api/ssr/pc-build-catalog` ONLY when the wizard
  mounts on `/pc-build` (never in bootstrap). Follow-up: replace with a curated
  PC-part feed so even `/pc-build` stops loading the whole catalog.
- **Catalog-dump safeguard:** `pageSize` stays clamped server-side to `[1,100]`
  (default 48); a huge `?pageSize` can never pull the whole catalog in one page.
- On a cold listing API failure the page shows an explicit bilingual error+retry
  (the full-catalog in-memory fallback is gone, so there is nothing to dump).
- Scope guard: local checkpoint commits only on this branch (no push/deploy);
  the untracked `freezone-dashboard/` and `reports/` folders were never staged.

## A-20 · Home page v2 — fixed design replaces the CMS-driven home (2026-11-25, branch `feat/homepage-v2`)
Owner decisions (asked): the whole new homepage goes live; product rows read the
live catalogue; ship by branch + PR; hero banners are fixed (not admin-managed).
Assumptions made while porting the design canvas:
- **Header/footer unchanged.** The canvas header/footer were mock chrome with
  placeholders; the live NavBar/Footer (real contact data, cart, locale) stay.
- **Category mapping** (resolved against the live category list at runtime; a
  missing slug falls back to `/products`, a missing/empty row is hidden):
  cards cctv→`cctv`, computers & laptops→`computers`|`laptops`, gaming→`gaming`,
  networking→`networking`, smart home→`smart-home`, power→`power-solutions`;
  rows `laptops`, `routers`|`networking`, `cctv`; promo pictures `networking`,
  `accessories`, `alarm-systems`|`security`, `power-solutions`.
- **Rows show in-stock products only**, 5 per row, server default sort.
- **Projects banner CTA** links to `/contact` (no quote form exists yet).
- **Hero banners are not links** (as designed).
- **Fonts** follow the storefront (IBM Plex Sans Arabic / Inter), not the
  canvas's Tajawal — no external font is added.
- **Admin impact:** home CMS sections and hero slides no longer affect the home
  page. The old components stay in the repo; rollback = revert the PR.

## A-21 · Whole storefront replaced by the static design site (2026-11-25, branch `feat/homepage-v2`)
Owner decisions (asked): replace the site "with the design as it is" — home and
product pages only, knowing online ordering, sign-in and order tracking go away;
carry the new 586-product catalogue with its new prices; preview first, merge on
the owner's go. Supersedes the header/footer, row-data and font points of A-20.
Assumptions made while building it:
- **Static catalogue, live data untouched.** "Replace with the new 586" is done on
  the storefront only: the 586 products ship as `freezone-web/src/site/data/*.json`
  + `public/catalog/*.webp`. Nothing was deleted or changed in the production
  database (its ~1,500 products are simply no longer shown). Deleting live data is
  a separate, destructive step that needs its own explicit confirmation (rule §9.6).
  Consequence: storefront products/prices change by editing those files and
  deploying, not from the admin panel.
- **Only selling prices** are in the shipped data; supplier cost figures never
  leave the working files (a test guards the JSON keys).
- **Cart = list + WhatsApp.** The design's cart is a counter with no checkout. So
  it is not a dead button, the cart is a panel listing the chosen products and
  total, with one action: open WhatsApp with the list typed in. No order is stored
  anywhere and nothing is simulated (rule §9.5).
- **Contact details need the owner's confirmation before go-live:** WhatsApp
  `+964 774 222 2377` (the default already in `freezone-api/src/lib/site-public.ts`
  and the old footer) and the address "شارع الزهور، مجاور أزياء دلير" (given by the
  owner for the new showroom; English form is a transliteration). Both live in
  `src/site/contact.ts` / `Site.address`.
- **Header:** the design's account icon is left out (no accounts); a language
  switch and a "Products" link are added; the four design links jump to parts of
  the home page. **Footer:** design links with no page behind them (About, Track
  order, Shipping, Returns) are left out; "Contact us" opens WhatsApp.
- **Links without matching products:** the "Power & solar" card and the
  "computer accessories" / "solar" promo pictures open the full product list — the
  catalogue has no such products yet.
- **English:** names come from the supplier lists; laptop specification lines are
  built from the same fields as the Arabic ones.
- **Fonts:** Tajawal (self-hosted, 400/500/700/800) for Arabic and Inter for Latin,
  as on the design canvas.
- **Retired addresses:** `/category/*` and `/brand/*` → product list; about,
  contact, policies, cart, checkout, account pages → home (`public/_redirects`);
  old numeric product ids → product list (edge function). Their code stays in the
  repo, unrouted. `seo-catbrand-404.ts` is removed (it validated landings that no
  longer exist). `/sitemap.xml` is now a static build output, not an API proxy.
- **Rollback:** revert the merge commit — no database or API change is involved.

## A-22 · Home page: short banner, cards on the first screen (2026-11-25, branch `feat/home-short-banner`)
Owner resized the design by hand (banner 1440 × 325, brand logos moved under the
section cards) and asked for the banner pictures, the bottom overlaps and
responsiveness to be fixed, then to push and merge.
- **Banner shape by page width:** 3:1 on phones, 3.6:1 from 700 px, 1440 × 325
  from 1024 px (the owner's size). The six banners remain 3:1 sets, centred and
  never stretched; each background was widened by 760 px per side from its own
  edges (reflected or pulled, then softened) to fill the sides.
- **Order:** banner → "shop by section" → brand logos → product rows.
- **Header** is 63 px tall as the owner set it. **Promo pictures** stay two per
  line down to tablet width.
- The fixed pixel heights the canvas editor had added are not carried over — the
  site was already fluid.

## A-23 · Storefront finished end to end, everything interactive (2026-11-28, branch `feat/storefront-interactive`)
Owner asked to "finish the website end to end and make everything interactive".
Read as: complete the live static storefront (A-21) — not the design canvas, and
not a return to the API checkout.
- **Ordering stays on WhatsApp, now with an order form.** New `/checkout` page:
  name, mobile number, governorate + address or pickup from the showroom, notes →
  one WhatsApp message to the store → "press send" screen → thank-you screen that
  empties the cart. Nothing is posted to the API; there is no payment step.
  Orders saved in the admin panel would need the 586 products loaded into the
  database and API deploys working again (Fly.io billing) — a separate job.
- **No delivery fee, delivery time, warranty or returns text is shown.** The old
  policy and FAQ copy (`src/lib/policy-content.ts`, `faq-content.ts`, `FAQ.*`
  strings) disagrees with itself (1-year vs 2-year warranty, 7 vs 30 days) and
  describes features this site no longer has, so it was not republished. The
  order page only says the store confirms availability, delivery and payment on
  WhatsApp. Policy pages wait for the owner's terms.
- **New pages:** `/checkout` and `/wishlist` (personal, noindex, not in the
  sitemap) and `/contact` (prerendered, in the sitemap): contact details, a
  question / project-quote form that writes the WhatsApp message, and "how
  ordering works". No map and no opening hours — neither is known.
- **Banner and brand links:** banners open the matching products; "Custom
  Servers" opens the quote form and "Epson" a question to the store, because the
  catalogue lists neither. Brand logos without products (Grandstream, Epson,
  PlayStation) open a question about that brand instead of doing nothing.
- **Saved in the visitor's browser only** (`fz-site-prefs-v1`): favourites,
  recently viewed, recent searches, and the order form's details for next time.
- **Search matches every word in any order** and treats أ/إ/آ/ا, ة/ه, ى/ي and
  Arabic-Indic digits as the same; the product list gained sort (price, new
  first), five price ranges and "available only".
- **Fixed on the way:** buttons were rendering at normal weight because a shell
  rule outranked their own (now `:where`); panels over the page moved out of the
  page's size container so `position: fixed` measures from the screen in every
  browser.
- **Rollback:** revert the merge commit — no database or API change is involved.
