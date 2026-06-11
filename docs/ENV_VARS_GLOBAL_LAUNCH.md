# New environment variables — Global Launch Sprint (2026-06-10)

`.env.example` files could not be edited from the sprint environment (permission
policy blocks all `.env*` paths). **Owner action:** copy the relevant lines below
into `freezone-api/.env.example` / `freezone-web/.env.example`. None of these are
secrets in themselves; never commit real values.

## freezone-api

```bash
# --- Admin auth (Phase 1 change: direct login is now DEV-ONLY) ---
# Production REQUIRES credentialed login. Before deploying this sprint, Fly secrets
# must include: ADMIN_SESSION_SECRET (>=32 chars), ADMIN_REQUIRE_PASSWORD=true,
# a strong ADMIN_PASSWORD, and a seeded admin user. ADMIN_DIRECT_LOGIN /
# ADMIN_SKIP_AUTH are ignored when NODE_ENV=production (fail-closed 403).
# Optional phone for the seeded SUPER_ADMIN (07XXXXXXXXX) — enables phone login:
ADMIN_PHONE=

# --- Payment gateway adapters (unconfigured = method disabled, NEVER simulated) ---
ZAINCASH_MERCHANT_ID=
ZAINCASH_SECRET=
ZAINCASH_MSISDN=
QICARD_MERCHANT_ID=
QICARD_API_KEY=
FIB_CLIENT_ID=
FIB_CLIENT_SECRET=
CARD_GATEWAY_KEY=

# --- Demo product seed (local/dev only; refuses production unless forced) ---
DEMO_SEED_FORCE=
```

## freezone-web

```bash
# --- Analytics (loaders are no-ops when unset) ---
VITE_GA4_ID=
VITE_META_PIXEL_ID=

# --- Prerender (build-time SEO shells) ---
# Prerender now FAILS the build when the API returns zero products,
# so a deploy can no longer silently ship without product pages.
# Escape hatch for empty-catalog environments:
PRERENDER_ALLOW_EMPTY=
```

## Deploy-blocking note (from Phase 1)

Production previously relied on `ADMIN_DIRECT_LOGIN=true` to relax the startup
secrets assertion. After this sprint that relaxation no longer applies in
production: the API **throws at startup** unless `ADMIN_SESSION_SECRET` (≥32),
`ADMIN_REQUIRE_PASSWORD=true`, and a strong `ADMIN_PASSWORD` are set. Verify Fly
secrets BEFORE deploying. See FINAL_REPORT.md deploy checklist.
