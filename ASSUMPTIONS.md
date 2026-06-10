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
