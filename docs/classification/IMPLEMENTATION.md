# Classification system — implementation map

This repo implements the [Universal Product Classification Framework](./FRAMEWORK.md) in **freezone-api** (source of truth) with **freezone-web** storefront filters driven by schema metadata.

## Data model (`freezone-api/prisma/schema.prisma`)

| Doc concept | Prisma model | Notes |
|-------------|--------------|--------|
| `Category` + tree | `Category` + `parentId` | Subcategories via self-relation |
| `CategoryAttribute` | `CategoryAttribute` | `type`, `filterable`, `options`, `unit`, … |
| `Product` | `Product` + `model` | Identity alongside `brand` / `brandId` |
| `ProductAttributeValue` | `ProductAttributeValue` | Typed EAV; synced to `Product.specs` JSON |
| `ProductVariant` | `ProductVariant` | SKU/options scaffold |

Legacy `Category.facetKeys` and `Product.specs` remain for backward compatibility and are kept in sync on admin save.

## Code layout

- `freezone-api/src/lib/classification/` — types, validation, sync, presets (stronger than docs: key-based type inference)
- `freezone-api/src/lib/admin-product-specs.ts` — admin save pipeline
- `freezone-api/src/lib/catalog.ts` — prefers normalized rows when present
- `freezone-web/src/lib/classification/product-filter.ts` — RANGE / BOOLEAN / MULTI_SELECT URL matching
- `freezone-web/src/lib/productFacetConfig.ts` — attribute-driven filters (`filterable !== false`)

## Operations

1. Apply migration: `cd freezone-api && npx prisma migrate deploy`
2. Generate client: `npx prisma generate`
3. Backfill existing DB: `npx tsx scripts/migrate-classification-from-legacy.ts`
4. Study guide (Arabic): open `docs/classification/study-map.html` in a browser

## Extended vs visible filters

- **Extended specs:** all `CategoryAttribute` rows (including `filterable: false`, `TEXT`, etc.)
- **Visible filters:** subset where `filterable === true` (sidebar + URL params)

Admin: set `filterable` per attribute when editing category facets (stored on `CategoryAttribute` after sync).
