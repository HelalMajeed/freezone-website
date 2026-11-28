# Home page v2

The storefront home page, ported from the "Home · Light" design canvas. Rendered by
`src/pages/HomePage.tsx` as a lazy chunk inside the storefront shell (`src/site`).

| Part | File | Data |
|---|---|---|
| Hero — six layered banners, 4 s each, six switch effects; arrows, dots, keyboard arrows and swipe step through them, hover or keyboard focus holds them, a click opens what the banner shows | `HeroFilms.tsx` | fixed (generated); click targets in `HERO_LINKS` |
| "Shop by section" (`#categories`) — six cards with looping scenes | `HomeSections.tsx` → `SectionCards` | each card opens the product list filtered to its section |
| Brand strip (`#brands`) | `HomeSections.tsx` → `BrandStrip` | fixed logos in `public/home-v2/brands`; brands with products link to their list, the others open a question about that brand on the contact page |
| Product rows — laptops, routers, CCTV, then "recently viewed" for returning visitors | `ProductRows.tsx` | five chosen catalogue ids per row (`src/site/data`); the last row comes from the browser (`src/site/prefs.ts`) |
| Promo pictures (`#offers`) | `HomeSections.tsx` → `PromoGrid` | fixed pictures, filtered-list links |
| Projects banner (`#solutions`) | `HomeSections.tsx` → `ProjectsBanner` | fixed photo; the button opens the project-quote form on the contact page |
| Rise-in as each part is reached | `Reveal.tsx` | — (off with reduced motion) |

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

The hero box is not 3:1 everywhere: `.cover` in `HomeV2.module.css` is 3:1 on phones, 3.6:1 from
700 px and 1440 × 325 from 1024 px, so the section cards share the first screen with it. Each
banner stays a 3:1 set, centred in that box and never stretched; its background is a widened copy
(`*_wide`, 760 px added on each side from the background's own edges) that fills the sides.

Pictures live in `public/home-v2/{hero,sections,brands,promos,projects}`. Each hero banner
is that empty background (`*_wide`), lettering (`*_t*`) and one picture per product (`*_m*`,
`*_p*`), stacked at fixed positions — replacing a banner means exporting a new set of layers
from the design, not swapping one file.

## What this page no longer uses

The CMS-driven home (`DynamicHomeSections`, `HomeLegacyContent`, `SolutionsDepartments`)
is still in the repo but is not rendered: the admin panel's "home sections" and hero
slides do not change this page.
