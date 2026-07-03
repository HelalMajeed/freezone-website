# FreeZone — Enterprise Safety Report (Sprint E1)

> Living document. Each fix records **Plan → Implementation → Verification →
> Rollback**. Nothing is marked `VERIFIED-LIVE` without a real production probe;
> branch-only work is `IMPLEMENTED (pending deploy)`. No "complete/100%" claims
> without measured evidence.
>
> Branch `claude/enterprise-global-readiness-audit`. Source of gap IDs:
> `docs/ENTERPRISE_GAP_AUDIT.md`.

## Status board

| ID | Title | Severity | Status |
|----|-------|----------|--------|
| SEO-1 | Real 404 for unknown category/brand slugs | Critical | **VERIFIED on deploy preview — pending production merge (PR #61)** |
| OPS-3 | API availability (min_machines_running=1) | High | TODO |
| SEC-1 | Enforce CSP (drop Report-Only) | Medium | TODO |
| SEC-2 | Fail-closed legacy admin password | Medium | TODO |
| SEC-3 | `requireSuperAdminMutate` for user-mgmt writes | Medium | TODO |
| SEC-4 | CSRF assertion on admin mutations | Medium | TODO |
| OPS-1 | Real, verified DB backup (owner secrets) | High | BLOCKED (needs secrets) |
| OPS-2 | Restore drill | High | BLOCKED (needs OPS-1) |
| OPS-4 | Error monitoring + uptime alerting | High | BLOCKED (needs `SENTRY_DSN`) |

---

## SEO-1 — Real HTTP 404 for unknown category & brand slugs

**Problem (live-confirmed 2026-07-03):** `GET /en/category/zzz-nope-xyz/` → **200**
and `GET /en/brand/zzz-nope-xyz/` → **200** (soft-404). Only the *product* route
had a real-404 edge function (`seo-product-404.ts`); category/brand were left out.
Violates the CLAUDE.md success targets `categories: real 404` / `brands: real 404`
and creates an infinite crawlable soft-404 space (crawl-budget + index-quality
drain for a ~1500-product store).

### Plan
Add a second Netlify edge function that mirrors the proven product-404 pattern
(fail-open) for the two landing routes, deciding existence against the **exact same
API data the storefront bootstrap uses** so it can never 404 a page the SPA would
render.

### Implementation
- New file: `freezone-web/netlify/edge-functions/seo-catbrand-404.ts`
  (`config.path = /en|ar/category/*` + `/en|ar/brand/*`).
- Existence checks mirror the client precisely:
  - **Category** valid ⇔ slug ∈ `GET /api/ssr/catalog/categories?locale=…` ids
    (`CategoryLandingPage.tsx:33` uses `c.id === slug`; category `id` **is** the DB
    slug).
  - **Brand** valid ⇔ slug matches a known brand `brandSlug(name)`/name **OR**
    `GET /api/ssr/catalog/products?brand=<slug>&pageSize=1` returns `total > 0`
    (mirrors `BrandLandingPage.tsx:80` which bounces only on `!brand && total===0`;
    `brandSlug()` copied verbatim and annotated to stay in sync).
  - Same data source as the bootstrap (`getCategoriesCatalog`/`getBrandsCatalog`),
    so the edge decision and the SPA decision cannot diverge.
- **FAIL OPEN:** any non-2xx / timeout / non-decisive response serves the page
  normally (2500 ms timeout, mirrors `seo-product-404.ts`). A backend hiccup must
  never 404 a valid page.
- On a genuine miss: serve the SPA shell with `status 404` + `x-robots-tag:noindex`
  + `cache-control:no-store` (identical to the product edge fn).

**Live pre-checks (endpoint contract validated before writing, 2026-07-03):**
categories return `[{id:"gaming",…},…]` (id = slug); brands return
`[{name:"MSI",…},…]`; unknown `brand=zzz-nope-xyz` → `total:0`; known `brand=HP` →
`total:34`. So both the category-membership and brand `total===0` signals are
decisive.

### Verification
- **Regression (done, local):** `npx tsc -b` → exit 0 (the `netlify/` dir is outside
  `tsconfig` `include: src/**`); `npm run lint` → exit 0 (`eslint src` scope). The
  app bundle is untouched — this file ships only via Netlify edge-function
  auto-discovery, exactly like the live `seo-product-404.ts`.
- **Behavior — VERIFIED on the PR #61 Netlify deploy preview (2026-07-03),** on
  both Netlify projects (`freezone-web` + `freezoneweb`):
  - `/en/category/zzz-nope-xyz/` → **404** + `X-Robots-Tag: noindex` +
    `Cache-Control: no-store` ✅
  - `/en/brand/zzz-nope-xyz/` → **404** ✅
  - `/ar/category/zzz-nope-xyz/` → **404**, `/ar/brand/zzz-nope-xyz/` → **404** ✅
  - `/en/category/gaming/` → **200**, `/en/brand/hp/` → **200**,
    `/ar/category/gaming/` → **200** (valid pages unchanged) ✅
- **Pending production confirmation** after the owner merges PR #61: re-run the same
  probes against `https://freezone-iq.com/`. (The preview runs the identical build +
  edge runtime, so production is expected to match.)
- Note: two Netlify projects (`freezone-web`, `freezoneweb`) build the same PR — see
  audit OPS-8 (double-deploy). Both previews returned identical correct results.

### Rollback
Delete `freezone-web/netlify/edge-functions/seo-catbrand-404.ts` and redeploy (or
`git revert` the commit). No other file is touched; no schema/data/config change; no
dependency added. Category/brand pages revert to the prior soft-404 (200) behavior —
i.e., exactly today's state.
