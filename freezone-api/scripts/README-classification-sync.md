# Classification sync (safe — no product wipe)

These scripts update **category attribute definitions** and migrate **legacy `Product.specs` JSON** into typed `ProductAttributeValue` rows (display + filter tokens).

They **do not** delete products and **do not** run `npx prisma db seed`.

## Prerequisites

1. Create `freezone-api/.env` (never commit it — see `.gitignore`).
2. Set a real `DATABASE_URL` for the database you intend to modify:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
   ```

3. Apply migrations first:

   ```bash
   cd freezone-api
   npx prisma migrate deploy
   ```

Use your **Fly/Neon/production** URL when syncing live catalog data.  
`.env.example` is documentation only — **do not** treat it as a live connection string.

## Local commands

```bash
cd freezone-api

# 1) Upsert CategoryAttribute rows from seed presets (no products touched)
npm run classification:seed

# 2) Migrate legacy product.specs → EAV (per-product replace of attribute values only)
npm run classification:sync-legacy

# Both in sequence
npm run classification:repair
```

### Dry-run (no writes)

Preview filter facets that would be generated:

```bash
npx tsx scripts/sync-legacy-product-specs.ts --dry-run
```

Example output:

```text
product 42 (laptops) preview: processor_family=Core i7, gpu_model=RTX 5070, ram_size=16, storage_size=512
```

## What gets written

| Field | Example |
|-------|---------|
| `displayValue` | Full marketing text (PDP) |
| `valueString` (filter) | `Core i7`, `RTX 5070`, `16`, `512` |

Long strings such as full Intel/NVIDIA descriptions are **not** stored as filter tokens.

## After deploy (Fly.io)

1. Ensure `DATABASE_URL` is set in Fly secrets (`flyctl secrets list -a freezone-website`).
2. Run migrations (deploy workflow or manually):

   ```bash
   flyctl ssh console -a freezone-website -C "cd /app && npx prisma migrate deploy"
   ```

3. Run classification repair **manually** when you intend to sync data:

   ```powershell
   # From repo root — optional helper (does not deploy)
   $env:FLY_RUN_CLASSIFICATION_REPAIR = "1"
   .\freezone-api\scripts\fly-deploy.ps1
   ```

   Or SSH:

   ```bash
   flyctl ssh console -a freezone-website -C "cd /app && npm run classification:repair"
   ```

**Forbidden on production catalog DB:**

```bash
npx prisma db seed   # wipes/resets demo data — never use on live catalog
```

## npm scripts reference

| Script | Command |
|--------|---------|
| `classification:seed` | `tsx scripts/seed-classification-only.ts` |
| `classification:sync-legacy` | `tsx scripts/sync-legacy-product-specs.ts` |
| `classification:repair` | seed + sync-legacy (no `prisma db seed`) |

## Troubleshooting

| Error | Action |
|-------|--------|
| `DATABASE_URL is not set` | Create `freezone-api/.env` with a valid URL |
| `Authentication failed` | Fix credentials in `DATABASE_URL` |
| `skip: no category schema` | Run `npm run classification:seed` first |
| Localhost warning | Expected for Docker dev; use production URL for Fly data |
