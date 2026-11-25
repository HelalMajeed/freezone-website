# Home page v2

The storefront home page, ported from the "Home · Light" design canvas. Rendered by
`src/pages/HomePage.tsx` as a lazy chunk inside the storefront shell (`src/site`).

| Part | File | Data |
|---|---|---|
| Hero — six layered banners, 4 s each, six switch effects | `HeroFilms.tsx` | fixed (generated) |
| Brand strip (`#brands`) | `HomeSections.tsx` → `BrandStrip` | fixed logos in `public/home-v2/brands`; brands with products link to their list |
| "Shop by section" (`#categories`) — six cards with looping scenes | `HomeSections.tsx` → `SectionCards` | each card opens the product list filtered to its section |
| Product rows — laptops, routers, CCTV | `ProductRows.tsx` | five chosen catalogue ids per row (`src/site/data`) |
| Promo pictures (`#offers`) | `HomeSections.tsx` → `PromoGrid` | fixed pictures, filtered-list links |
| Projects banner (`#solutions`) | `HomeSections.tsx` → `ProjectsBanner` | fixed photo; the button opens a WhatsApp chat with the store |

Strings: `HomeV2` in `src/messages/{ar,en}.json`. Layout: `HomeV2.module.css`; the
product card is shared with the product pages (`src/site/ProductCard.tsx`).

## Generated files (`generated/`)

`heroScenes.ts`, `sectionScenes.ts` and `homeMotion.css` are exported from the design
canvas and are not meant to be edited by hand:

- the markup strings are static decoration (no user data) and are inserted with
  `dangerouslySetInnerHTML`;
- `homeMotion.css` is a global stylesheet; every class and keyframe starts with `fzh-`
  (the storefront already uses `fz-`);
- all `cqw` lengths refer to `.root` in `HomeV2.module.css`, which is a size container
  as wide as the page.

Pictures live in `public/home-v2/{hero,sections,brands,promos,projects}`. Each hero banner
is an empty background (`*_plate`), lettering (`*_t*`) and one picture per product (`*_m*`,
`*_p*`), stacked at fixed positions — replacing a banner means exporting a new set of layers
from the design, not swapping one file.

## What this page no longer uses

The CMS-driven home (`DynamicHomeSections`, `HomeLegacyContent`, `SolutionsDepartments`)
is still in the repo but is not rendered: the admin panel's "home sections" and hero
slides do not change this page.
