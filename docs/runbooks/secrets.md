# Admin secrets (Fly.io production)

The API refuses to start in production unless admin secrets are configured correctly (`assertAdminSecretsConfigured` in `freezone-api/src/lib/admin-secrets.ts`).

## Required on Fly (`freezone-api`)

| Secret | Purpose |
|--------|---------|
| `ADMIN_SESSION_SECRET` | Signs legacy `fz_admin_session` cookie — **≥32 random chars** |
| `ADMIN_PASSWORD` | Legacy admin login when `ADMIN_REQUIRE_PASSWORD=true` — **≥12 chars** |
| `ADMIN_REQUIRE_PASSWORD` | Set to `true` in production |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Storefront/customer JWT (if used) — **≥32 chars** |

`ADMIN_SESSION_SECRET` and `ADMIN_PASSWORD` **must differ**.

## Set secrets (Fly CLI)

```bash
cd freezone-api
fly secrets set ADMIN_SESSION_SECRET="$(openssl rand -base64 32)"
fly secrets set ADMIN_PASSWORD="your-strong-password-here"
fly secrets set ADMIN_REQUIRE_PASSWORD=true
```

On Windows without OpenSSL, generate a 32+ character random string in a password manager and paste it.

## Dashboard operators

Data-entry staff use **dashboard sessions** (`fz_dashboard_session`), not the legacy admin cookie.

1. Apply migration `20260525120000_admin_roles_and_audit_actor` on your database (not auto-applied to production by the agent).
2. Run `npx tsx scripts/seed-operators.ts` locally against the target DB.
3. Read passwords from `OPERATORS_CREDENTIALS.md` (gitignored) and distribute securely.
4. Operators sign in at `/dashboard/login`.

## GitHub Actions

For automated deploys, set `FLY_API_TOKEN` in the repository secrets (see `docs/SECRETS_CHECKLIST.md`).

## Local development

Without production env, the API logs a warning if `ADMIN_SESSION_SECRET` is unset and uses a dev-only fallback. Do not rely on this in staging or production.
