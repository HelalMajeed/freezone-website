# Global Iraq → FreeZone product importer

Sample-only scrape + import pipeline that pulls products from
`https://globaliraq.iq` (Shopify storefront) into the FreeZone catalog
under a quarantined "staging" category.

## Safety rules baked in

- **Sample-only**: `import-sample.mjs` refuses to run without an explicit
  `--limit` and hard-caps at `SAMPLE_MAX = 10`.
- **Concurrency**: two layers of locks (local `.lock` file + DB row in
  `ImportBatch` with `status='running'`). A second run aborts.
- **Default mode is `--dry-run`** — no DB writes, no HTTP calls into the
  FreeZone API. Only `--live` performs writes, and only after both env
  vars are present.
- **Images never reference Shopify CDNs in the final DB.** Every image is
  re-fetched by `/api/admin/media/import-image` (SSRF-validated, then
  saved into the persistent `/uploads/products/...` Fly volume) and the
  Shopify URL is only kept in `ProductImage.originalSourceUrl` for audit.
- **Products land unpublished** (`published: false`) inside the
  `staging-imports` category so they are invisible to customers until an
  admin reviews and re-categorises them.
- **No deletion / reset / truncate / seed** code lives here. The
  `dry-run-delete.mjs` script only lists what an undo would touch.

## Pipeline

```
discover.mjs           sitemap.xml  →  data/handles.json
scrape-product.mjs     /products/<handle>.json  →  data/products/<handle>.json
                                                →  data/mapped/<handle>.json  (FreeZone payload)
import-sample.mjs      data/mapped/*.json  →  ImportBatch + Product + ProductImage
verify.mjs             reads DB + data/mapped to confirm parity
dry-run-delete.mjs     lists what an undo would cascade — never deletes
```

`data/` is gitignored so scraped JSON never leaks into the repo.

## Usage

```bash
# 1. Discover. Writes data/handles.json (Arabic locale by default).
node scripts/import-globaliraq/discover.mjs

# 2. Scrape the first N. Writes data/products/<handle>.json + data/mapped/<handle>.json
node scripts/import-globaliraq/scrape-product.mjs --limit=5

# 3. See what would happen (no DB, no API, prints + writes data/dry-run-*.json)
node scripts/import-globaliraq/import-sample.mjs --limit=5

# 4. Live import (refuses to run without --limit; capped at 10)
export DATABASE_URL=...                    # target DB (DO NOT point at prod accidentally)
export FREEZONE_API_URL=https://...        # base URL of the API
export FREEZONE_ADMIN_PASSWORD=...         # admin password
node scripts/import-globaliraq/import-sample.mjs --limit=5 --live

# 5. Verify
DATABASE_URL=... node scripts/import-globaliraq/verify.mjs --latest

# 6. Inspect what a cleanup would touch (does NOT delete)
DATABASE_URL=... node scripts/import-globaliraq/dry-run-delete.mjs --latest
```

## Mapping rules

Currently encoded in `lib/map-product.mjs`:

| FreeZone field            | Source                                                    |
|---------------------------|-----------------------------------------------------------|
| `nameEn` / `nameAr`       | `product.title` (same value both languages — admin can edit) |
| `brand` (free-text)       | `product.vendor`                                          |
| `sku`, `model`            | first `variant.sku`, `product.title`                      |
| `descEn` / `descAr`       | plain-text projection of `product.body_html` (cap 8 kB)   |
| `oldPrice`                | first `variant.price` (IQD, integer)                      |
| `price`                   | `oldPrice × 1.35`, rounded                                |
| `specs.warranty`          | `"ضمان سنتين وكالة"`                                       |
| `specs.<key>`             | extracted `<li><strong>Key</strong>: Value</li>` pairs    |
| `published`               | `false` (always — admin must publish manually)            |
| `categoryId`              | `staging-imports` (created on first run if missing)       |
| `sourceUrl`               | `https://globaliraq.iq/products/<handle>`                 |
| `sourceHandle`            | `product.handle`                                          |
| `sourcePrice`             | original `variant.price` for audit                        |
| `importedAt`              | timestamp at scrape time                                  |
| `importBatchId`           | the active `ImportBatch.id`                               |

Variants are scraped and dumped to `data/mapped/<handle>.json` but **not**
created on import — the FreeZone `/api/admin/products` endpoint has no
variants helper yet (see Product schema TODO note). When variants land,
the importer will pick them up unchanged.

## Schema additions (in `prisma/schema.prisma`)

Migration: `20260523230000_import_tracking/migration.sql` (additive only)

```prisma
model Product {
  // ...existing fields...
  sourceUrl     String?
  sourceHandle  String?
  sourcePrice   Int?
  importedAt    DateTime?
  importBatchId String?
  importBatch   ImportBatch? @relation(fields: [importBatchId], references: [id], onDelete: SetNull)
  @@index([sourceHandle])
  @@index([importBatchId])
}

model ImportBatch {
  id         String    @id @default(cuid())
  source     String
  status     String    @default("running")
  total      Int       @default(0)
  succeeded  Int       @default(0)
  failed     Int       @default(0)
  lockOwner  String?   // hostname:pid that owns this run
  results    Json?
  products   Product[]
  // ...timestamps...
}
```

All columns are nullable; existing rows are untouched.
