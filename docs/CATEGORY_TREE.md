# Category tree (hierarchical taxonomy)

Date: 2026-06-11 · Branch: `feat/category-tree-delta` (delta on `feat/global-launch`)

The catalog taxonomy is a **one-level tree** on `Category.parentId`
(self-relation `CategoryTree`, index `[parentId, sortOrder]`). The seed list in
`freezone-api/src/lib/data.ts` (mirrored byte-for-byte in
`freezone-web/src/lib/data.ts` — keep them identical) defines 18 top-level
categories plus 27 bilingual children linked by `parent` slug.

## Seeded tree

| Parent (existing top-level) | Children |
|---|---|
| `security` | ip-cameras, dvr-nvr, wifi-cameras, alarm-systems, fingerprint-attendance, smart-locks, intercom |
| `computers` | business-laptops, gaming-laptops, everyday-laptops, desktops-builds |
| `gaming` | consoles, controllers, gaming-accessories |
| `networking` | routers, access-points, switches, cables-tools |
| `smart-home` | smart-lighting, plugs-switches, sensors, smart-hubs |
| `power-solutions` | ups, inverters, lithium-batteries, solar-systems, converters |

"Mobiles & Accessories" is covered by the existing top-level `phones` +
`accessories`; it needs no children.

## Design decisions

- **No existing top-level was re-parented.** `cctv`, `laptops`, `monitors`,
  `printers`, `components` etc. semantically overlap the mission tree
  (e.g. laptops "belong" under Computers) but they carry live products,
  classification presets and indexed `?cat=`/`/category/<slug>` URLs.
  Re-parenting them would change homepage tile composition and live page
  behavior with no upside, so they stay flat siblings. Children that cover
  the same ground (`gaming-laptops`, `ip-cameras`, …) were added as new slugs.
- **Membership is tree-aware (one level).** A parent category page/filter also
  matches products homed on its children — implemented in BOTH:
  - API: `categoryMembershipWhere` in `freezone-api/src/lib/catalog-filter.ts`
    (primary + secondary category, direct or via `parent`);
  - storefront: `productBelongsToCategoryTree` in
    `freezone-web/src/lib/productCategoryMembership.ts` (category landing
    pages, `/products` client mode, home rails/tabs).
  Keep the two in sync if the tree ever gains more depth.
- **Nav stays top-level.** The mega menu comes from CMS `navItems` (or the
  hard-coded `default-mega-nav.ts` fallback) and does not render the catalog
  category list, so adding children cannot explode it. Homepage tiles, the
  category icon strip and the promo mega grid filter to `!category.parent`.
  Children are discovered via: subcategory chips on the parent landing page,
  search suggestions, the sitemap, and direct links.
- **Facet presets via slug aliases.** New child slugs are aliased to the
  closest preset schema in `CATEGORY_SCHEMA_SLUG_ALIASES`
  (`routers → networking`, `ip-cameras → cctv`, …) so child pages get
  meaningful filters out of the box. `seed.ts` resolves the alias only for
  child categories (top-level behavior unchanged).
- **SEO**: the sitemap lists every active category, so child URLs are emitted
  automatically; the prerender derives its category shells from the sitemap
  and now adds the parent crumb to a child's BreadcrumbList JSON-LD, matching
  the runtime `CategoryLandingPage` breadcrumb.

## Storefront behavior

- `/:locale/category/<parent>` — hero shows subcategory chips
  (`Landing.subcategories`), grid includes child-homed products.
- `/:locale/category/<child>` — breadcrumb Home → Parent → Child, "All
  {parent}" back-link (`Landing.backToParent`), bilingual empty state when the
  child has no products yet.
- `/products?cat=<parent|child>` — server-filtered, tree-aware, with the
  child's aliased facet schema.

## Production rollout note

The production database is **not** reseeded by deploys. Child categories
appear in production by either (a) creating them in the admin Categories page
(parent select exists in the form), or (b) an intentional, owner-approved
re-seed. Until then production simply keeps its current flat taxonomy — every
change here is additive and backwards-compatible (categories without
`parentId` behave exactly as before).

Demo data: `prisma/seed-demo-products.ts` homes 9 of the 29 demo products on
child categories (routers, switches, access-points, dvr-nvr,
fingerprint-attendance, controllers, ups, desktops-builds, gaming-laptops);
every previously populated top-level page still lists products through the
tree.
