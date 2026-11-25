# The storefront (`src/site`)

Everything a visitor sees outside `/admin`: header, footer, home page, product list,
product page and cart. Ported from the design canvas ("Home · Light" and "Products").

**It is static.** The catalogue is data shipped with the site, not read from the API, so
the store renders the same whether or not the API is up — and a product, price or picture
changes by editing the files below and deploying, **not** from the admin panel.

| Part | File |
|---|---|
| Shell — locale, `<html lang/dir>`, analytics page views, links to home sections | `SiteLayout.tsx` |
| Header (nav, language switch, search, cart button, phone menu) | `SiteHeader.tsx` |
| Footer (address, WhatsApp, shop links, Instagram) | `SiteFooter.tsx` |
| Home page | `src/pages/HomePage.tsx` → `src/components/home-v2/` |
| Product list — brand / section / type chips, search, paging, all kept in the URL | `ProductsListPage.tsx` |
| Product page — picture, price, specifications, similar products | `ProductPage.tsx` |
| Product card (home rows, list, similar products) | `ProductCard.tsx` |
| Cart — a list kept in the browser, sent to the store as a WhatsApp message | `cart.ts`, `CartPanel.tsx` |
| Catalogue types, loading, filter logic | `catalog.ts` (tests: `catalog.test.ts`) |
| Store contact details | `contact.ts` (address text: `Site.address` in the messages) |

Routes (`src/App.tsx`): `/:locale`, `/:locale/products`, `/:locale/product/:id`, and a
locale 404. Strings: `Site` (and `HomeV2`) in `src/messages/{ar,en}.json`.

## The catalogue (`data/`)

- `catalog.json` — `cats`, `subs`, `brands` (display order) and `products`:
  `id` (`FZ-001`…, no gaps), `brand` (`""` = other brands), `model`, `cat`, `sub`,
  `nameAr`, `nameEn`, `kindAr`, `kindEn` (card title: the type without brand and model),
  `price` (selling price, whole IQD — never a cost price), optional `flag`: `"new"` or `"out"`.
- `features.ar.json`, `features.en.json` — product id → specification lines (loaded on
  the product page only).
- Pictures: `public/catalog/<id>.webp` (640×640) and `public/catalog/s/<id>.webp` (320×320).

Arabic names carry invisible direction marks around Latin brand/model text so mixed
lines read correctly; `plainText()` strips them for titles, search and messages.

### Changing it

- **Price / name / availability:** edit the product in `catalog.json`.
- **New product:** add it with the next free id, add its lines to both `features.*.json`,
  make its pictures (`node scripts/catalog-picture.mjs FZ-587 photo.jpg`), and raise
  `LAST_PRODUCT` in `netlify/edge-functions/seo-product-404.ts`.
- **Remove a product:** ids must stay gap-free — mark it `"flag": "out"` instead, or
  renumber the last product into its place (and move its pictures and feature lines).

`npm test` and the build (`scripts/prerender.mjs`) both refuse a catalogue with a gap in
ids, a missing picture, a non-integer price, or an edge-function constant that disagrees.

## SEO

`scripts/prerender.mjs` (postbuild) writes a static shell with title, description,
canonical, hreflang and JSON-LD for the home page, the product list and every product in
both languages, plus `dist/sitemap.xml`. It reads `data/catalog.json` — no network.
Filtered list addresses (`?brand=…`) all point their canonical at `/:locale/products/`.

## What the site no longer has

Online checkout, customer accounts, order tracking, wishlist/compare, PC builder,
category/brand landing pages and the policy pages are not routed (their code is still in
the repo; their old addresses redirect in `public/_redirects`). The admin panel and the
API are unchanged, but the products, prices and home sections edited there do not appear
on this storefront.
