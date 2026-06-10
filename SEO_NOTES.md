# SEO_NOTES — How FreeZone SEO works after the phase2/seo changes

Date: 2026-06-10 · Branch: `phase2/seo` · Agent A (SEO & Discoverability)

## 1. The model: build-time prerender, static delivery

No server renders HTML in production. Netlify serves the Vite SPA plus
**build-time prerendered HTML shells** written by `freezone-web/scripts/prerender.mjs`
(`postbuild` hook of `npm run build`). Each shell is `dist/index.html` with the
correct bilingual `<title>/<meta>/canonical/hreflang/OG/Twitter` tags and JSON-LD
injected, written to `dist/<locale>/<route>/index.html`. Netlify serves the real
file before the SPA catch-all, so crawlers and link unfurlers get correct metadata
without executing JS; users still get the normal SPA (the runtime `<Seo>` component
adopts/updates the same `data-fz-seo` tags on hydration).

Routes prerendered per locale (`en`, `ar`):

| Route set | Source | JSON-LD |
|---|---|---|
| 12 static routes (home, products, about, contact, pc-builder, track-order, shipping, returns, **warranty**, **faq**, privacy, terms) | `src/messages/{en,ar}.json` → `Seo.*` | — |
| `/{locale}/product/{id}` (≤ `PRERENDER_MAX_PRODUCTS`, default 500) | `GET {API}/api/ssr/storefront-bootstrap?locale=…` | Product + BreadcrumbList |
| `/{locale}/category/{slug}` | slugs parsed from `GET {API}/api/public/sitemap.xml`; names/images from the bootstrap | BreadcrumbList |
| `/{locale}/brand/{slug}` | slugs from the sitemap; display names matched from bootstrap brands (name-derived slug), fallback humanized slug | BreadcrumbList |

Category/brand slugs are taken from the **sitemap itself** so prerendered URLs match
the crawled URLs exactly (the bootstrap brand payload carries no DB slug).

### Prerender hardening (fail-loud deploys)

The script previously exited 0 on any failure — a deploy could silently ship with
zero product pages. Now it **exits non-zero** when:

- the bootstrap (products/categories) fetch fails for a locale, or
- a locale returns **0 products**, or
- the sitemap fetch fails (category/brand shells impossible), or
- `dist/index.html` is missing.

`PRERENDER_ALLOW_EMPTY=1` downgrades all of these to warnings (for local/dev builds
against an empty database). `PRERENDER_SKIP=1` still skips prerendering entirely
(used by CI verify jobs; the real Netlify deploy job runs the strict path).

### Staleness limits (inherent to this model)

- Metadata is frozen at **build time**. New/renamed products, categories, brands or
  price/stock changes do not update shells until the next deploy. The runtime `<Seo>`
  component corrects tags for JS-executing visitors, and Googlebot renders JS on the
  second-wave crawl — but first-wave HTML can be up to one deploy old.
- Products beyond `PRERENDER_MAX_PRODUCTS` (500/locale) get no shell (sitemap still
  lists them; runtime meta still works once JS runs).
- Practical mitigation: redeploy (or schedule a periodic rebuild) after large catalog
  imports.

## 2. Canonical URL form: trailing slash everywhere

Netlify pretty-URLs 301 `/en/product/194` → `/en/product/194/` for every prerendered
directory, so **the trailing-slash form is what serves 200** and is the canonical
form. Aligned in one sweep — keep these in sync if you touch any of them:

- `scripts/prerender.mjs` — canonical, hreflang, og:url, Product JSON-LD `offers.url`,
  BreadcrumbList `item` URLs (helper `canonicalUrl`).
- `src/components/seo/Seo.tsx` — runtime canonical + hreflang (exported helper
  `canonicalSitePath`, reused by `BreadcrumbJsonLd`/`ProductJsonLd`; `StoreJsonLd`
  search target updated too).
- `freezone-api/src/app/api/public/sitemap.xml/route.ts` — every emitted URL ends
  with `/` (home = `/{locale}/`).

## 3. Delivery: `_redirects` / `_headers` in `freezone-web/public/`

The root `netlify.toml` is **dead config**: the deploy uses `nwtgck/actions-netlify`
(manual API deploy of `freezone-web/dist`), which ignores repo-level `netlify.toml`.
Files inside the publish dir are always honored, so delivery rules live in:

**`public/_redirects`** (order matters; force-proxies first, SPA fallback last):

```
/sitemap.xml https://freezone-website.fly.dev/api/public/sitemap.xml 200!
/uploads/* https://freezone-website.fly.dev/uploads/:splat 200!
/* /index.html 200
```

This fixes the live bug where `https://freezone-iq.com/sitemap.xml` returned SPA
HTML. Note the `200!` on `/uploads/*` intentionally shadows the stale snapshot
copies committed under `public/uploads/` — the API host is the system of record.

**`public/_headers`**: security headers on `/*` (X-Frame-Options DENY,
X-Content-Type-Options nosniff, Referrer-Policy strict-origin-when-cross-origin,
Permissions-Policy camera/microphone/geolocation off, HSTS max-age=63072000),
immutable caching for hashed `/assets/*`, `X-Robots-Tag: noindex` for `/dashboard/*`
and `/admin/*`, plus the pre-existing favicon/brand cache rules.

**`public/robots.txt`**: unchanged policy (`Disallow: /dashboard`, `/admin`;
`Sitemap: https://freezone-iq.com/sitemap.xml` — which now actually serves XML).

## 4. Known limitation: no real HTTP 404 on unknown slugs (GAP_REPORT A-3)

Static Netlify + SPA catch-all means **any** unknown URL (e.g.
`/en/product/999999`) returns HTTP 200 with the SPA shell; the router then shows
the client-side 404 / redirects to `/products`. A real 404 status for arbitrary
slugs is impossible without a runtime server or edge function. Mitigations in
place: prerendered shells exist for every real route, the sitemap only lists real
URLs, thin/duplicate pages set `noindex`, and Google treats client redirects to
the listing page as soft-404s (excluded, not penalized). If real 404s ever become
a requirement, the path is a Netlify Edge Function that checks the path against a
build-time manifest — do not attempt it inside the SPA.

## 5. Post-deploy human steps (cannot be automated from the repo)

1. **Verify domain in Google Search Console** (DNS TXT or HTML-file method) for
   `freezone-iq.com`.
2. **Submit the sitemap**: Search Console → Sitemaps → `https://freezone-iq.com/sitemap.xml`
   (confirm it serves XML first: `curl -s https://freezone-iq.com/sitemap.xml | head`).
3. **Request indexing** for the high-value pages (home, top categories, top
   products) via URL Inspection → Request Indexing after the first deploy with
   these changes.
4. Validate structured data with the Rich Results test on one product, one
   category and the home page.
5. **Google Merchant Center** (optional but recommended for Shopping surfaces):
   create the account, verify/claim `freezone-iq.com` via Search Console, and add a
   product feed. There is no feed endpoint yet — products can be added via the
   Merchant Center "website crawl" (relies on the Product JSON-LD now present on
   product pages) until a dedicated `/api/public/merchant-feed.xml` is built.
6. Check `https://freezone-iq.com/en/` headers (`curl -sI`) to confirm the new
   security headers and `X-Robots-Tag` on `/dashboard/`.

## 6. Recommendation: keep `_redirects`/`_headers` authoritative

Either delete the root `netlify.toml` redirect/header sections or (eventually) pass
`netlify-config-path` to `nwtgck/actions-netlify` so config is honored from one
place. Until then, **`freezone-web/public/_redirects` and `_headers` are the single
source of truth** for Netlify behavior; treat the root `netlify.toml` as
documentation only. Duplicating rules in both places risks silent drift — prefer
editing the `public/` files, which are exercised by every deploy.
