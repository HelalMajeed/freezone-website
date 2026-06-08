# Deployment Checklist — Freezone

Gate every production release with this checklist. Deploys are automated via
`.github/workflows/deploy-production.yml` (API → Fly `freezone-website`,
storefront → Netlify `freezone-web`). The deploy workflow is gated on the
`verify-api` and `verify-web` jobs, which mirror CI (lint, test, build) against
the SHA being deployed.

## Pre-deploy

- [ ] CI is green on the target SHA (`CI` workflow: `freezone-web`,
      `freezone-api`, `freezone-storefront`).
- [ ] All required secrets are present (see `docs/SECRETS_CHECKLIST.md`):
  - GitHub Actions: `FLY_API_TOKEN`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`.
  - Fly `freezone-website`: `DATABASE_URL`, `ADMIN_PASSWORD`,
    `ADMIN_SESSION_SECRET`, `ADMIN_REQUIRE_PASSWORD=true`.
- [ ] Prisma schema changes have a committed migration in
      `freezone-api/prisma/migrations/` (migrations apply automatically on
      machine boot via `docker-entrypoint.sh` → `prisma migrate deploy`).
- [ ] A recent encrypted DB backup exists (Backup workflow runs daily 03:00 UTC;
      trigger `Backup production database` manually before risky migrations).
- [ ] Route parity passes (`npm run routes:check` in `freezone-api`).

## Deploy

- [ ] Merge/push to `main` (or run `Deploy production` via `workflow_dispatch`).
- [ ] `verify-api` and `verify-web` pass.
- [ ] `deploy-api` (Fly) succeeds; machine boots and self-migrates.
- [ ] `deploy-web` (Netlify) succeeds (gated on `deploy-api`).

## Post-deploy smoke checks

- [ ] API health: `https://freezone-website.fly.dev/api/public/health` (or
      equivalent) returns OK.
- [ ] Migration state: `flyctl ssh console -a freezone-website -C "cd /app && npx prisma migrate status"`.
- [ ] Storefront home, a PLP, and a PDP render with images (verify
      `/uploads/*` proxy resolves).
- [ ] Arabic/RTL route renders correctly.
- [ ] Admin direct-login (secret link) gate works as expected.
- [ ] COD checkout happy path completes.
- [ ] Sentry shows no new error spike (`SENTRY_ENVIRONMENT=production`).

## Rollback

- [ ] API: `flyctl releases -a freezone-website` then
      `flyctl deploy -a freezone-website --image <previous>` (or
      `flyctl releases rollback`).
- [ ] Storefront: re-publish the previous Netlify deploy.
- [ ] Data: see `docs/DISASTER_RECOVERY.md` (RPO ≤ 24h, RTO ≤ 4h).

## References

- Backup & restore: `docs/DISASTER_RECOVERY.md`
- Secrets: `docs/SECRETS_CHECKLIST.md`, `docs/runbooks/secrets.md`
- QA gate: `docs/QA_CHECKLIST.md`
