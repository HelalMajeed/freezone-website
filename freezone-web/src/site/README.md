# The storefront (`src/site`)

Everything a visitor sees outside `/admin`: header, footer, search, home page, product
list, product page, cart, order form, favourites and contact. Home and products were
ported from the design canvas ("Home · Light" and "Products"); the rest follows the same
look (ASSUMPTIONS A-23).

**It is static.** The catalogue is data shipped with the site, not read from the API, so
the store renders the same whether or not the API is up — and a product, price or picture
changes by editing the files below and deploying, **not** from the admin panel.

| Part | File |
|---|---|
| Shell — locale, `<html lang/dir>`, analytics page views, links to home sections, the layer for panels over the page | `SiteLayout.tsx`, `layer.tsx` |
| Header (stays on screen; sections and brands panels, language switch, search, favourites, cart) | `SiteHeader.tsx` |
| Phone menu (slides in from the side) | `SiteMenu.tsx` |
| Search panel — results while typing, from any page (`/` opens it) | `SearchPanel.tsx` |
| Footer (address, WhatsApp, shop and help links, Instagram) | `SiteFooter.tsx` |
| Home page | `src/pages/HomePage.tsx` → `src/components/home-v2/` |
| Product list — brand / section / type chips, search, sort, price range, available-only, paging, all kept in the URL | `ProductsListPage.tsx` |
| Product page — picture (zoom + large view), price, quantity, favourite, share, ask on WhatsApp, specifications, similar and recently viewed products | `ProductPage.tsx` |
| Product card (home rows, list, similar products, favourites) | `ProductCard.tsx` |
| A line of cards that scrolls sideways, with arrows for a mouse | `Rail.tsx` |
| Cart — a list kept in the browser, in a panel from the side | `cart.ts`, `CartPanel.tsx` |
| Order page — details form → one WhatsApp message to the store → confirmation | `CheckoutPage.tsx`, `order.ts` (tests: `order.test.ts`) |
| Favourites page | `FavoritesPage.tsx` |
| Contact page — contact details, question / project-quote form (WhatsApp), how ordering works | `ContactPage.tsx` |
| What the browser remembers: favourites, recently viewed, recent searches, order-form details | `prefs.ts` |
| Messages after an action, floating WhatsApp / back-to-top buttons, shared open/closed state | `Toasts.tsx`, `FloatingActions.tsx`, `ui.ts`, `actions.ts`, `overlay.ts` |
| Catalogue types, loading, filter and search logic | `catalog.ts` (tests: `catalog.test.ts`) |
| Store contact details | `contact.ts` (address text: `Site.address` in the messages) |

Routes (`src/App.tsx`): `/:locale`, `/:locale/products`, `/:locale/product/:id`,
`/:locale/checkout`, `/:locale/wishlist`, `/:locale/contact`, and a locale 404. Strings:
`Site` (and `HomeV2`) in `src/messages/{ar,en}.json`.

### Ordering

There is no online checkout or payment. The cart leads to the order page, where the
visitor enters name, mobile number (`07XXXXXXXXX`; `+964…` and Arabic digits are accepted)
and either a governorate + address or pickup from the showroom. "Send" opens WhatsApp
with the whole order written out (`order.ts` → `buildOrderMessage`); the page then asks
them to press send there and, once they confirm, empties the cart. Nothing is sent to the
API, so orders do not appear in the admin panel. The page states no delivery fee or time:
the store confirms those in the chat.

### Layout rule for anything `position: fixed`

`.frame` (header + page + footer) is a CSS size container, and a size container can become
the box that `position: fixed` measures from. Panels, bars and viewers therefore render
outside it: shell-level ones directly in `SiteLayout`, page-level ones through
`<InLayer>` (`layer.tsx`). Their styles use px / vw, not `cqw`.

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
The contact page is prerendered and in the sitemap too; the order page and the favourites
page are personal (`noindex`, no shell, not in the sitemap).

## What the site does not have

Online payment, customer accounts, order tracking, compare, PC builder, category/brand
landing pages and policy pages (delivery, warranty, returns) are not routed — the earlier
code is still in the repo and the old addresses redirect in `public/_redirects`. Policy
pages wait for the store's actual terms (ASSUMPTIONS A-23). The admin panel and the API
are unchanged, but the products, prices and home sections edited there do not appear on
this storefront.
