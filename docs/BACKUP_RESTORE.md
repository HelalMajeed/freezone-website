# Backup & Restore — FreeZone IQ

Operational backup/restore reference for production. This is the day-to-day
runbook; the recovery-objectives and incident contacts live in
`docs/DISASTER_RECOVERY.md` (RPO ≤ 24h, RTO ≤ 4h).

## What is backed up

| Asset | Source | Mechanism |
|-------|--------|-----------|
| PostgreSQL database | Fly Postgres `freezone-website-pg` | `pg_dump -Fc` (custom format), encrypted, uploaded as a workflow artifact |
| Product image uploads | Fly volume `/app/public/uploads` | Volume snapshot (Fly) / optional R2/S3 sync |
| Secrets | Fly secrets + GitHub Actions secrets | Documented (names only) in `docs/SECRETS_CHECKLIST.md` — never dumped to a backup |

## Automated database backup

- Workflow: `.github/workflows/backup-database.yml`.
- Schedule: **daily at 03:00 UTC** (`cron: "0 3 * * *"`) — honors the ≤ 24h RPO.
- Retention: 7 days of artifacts.
- Manual run: trigger **Backup production database** via `workflow_dispatch`
  before any risky migration or data operation.

The dump is encrypted before upload. Do not commit dumps or encryption keys to
the repository.

## Restore database

> Restore is destructive to the target database. Restore onto a fresh instance
> first whenever possible, validate, then cut over. Never run
> `prisma migrate reset` against production.

```bash
# 1) Put the API into maintenance / stop writes
flyctl apps restart freezone-website        # after enabling maintenance

# 2) Restore the dump onto the target DB (decrypt the artifact first)
pg_restore -h 127.0.0.1 -p 15432 -U freezone_website -d freezone_website \
  --clean --if-exists <decrypted-dump-file>.dump

# 3) Reconcile schema
cd freezone-api && npx prisma migrate deploy

# 4) Bring the API back
flyctl machine start -a freezone-website

# 5) Verify
cd freezone-api && npm run db:status        # migration state
cd freezone-api && npm run db:counts        # row counts sanity-check
```

Then smoke-check one product page and the COD checkout happy path
(see `docs/QA_CHECKLIST.md`).

## Restore uploads (images)

- Restore from the latest Fly volume snapshot, or re-sync from the R2/S3 mirror
  if periodic file backup is enabled.
- Confirm the storefront `/uploads/*` proxy resolves a known product image.

## Verifying a backup (quarterly DR drill)

1. Spin up a staging DB.
2. Restore the most recent dump (steps above, pointing at staging).
3. Run `npm run db:counts` and confirm counts are in the expected range.
4. Load one product detail page against the restored data.
5. Record the result in the DR log / `#incidents`.

## References

- Recovery objectives, contacts, image recovery detail: `docs/DISASTER_RECOVERY.md`
- Secret inventory (names only): `docs/SECRETS_CHECKLIST.md`, `docs/runbooks/secrets.md`
- Deploy gate & rollback: `docs/DEPLOYMENT_CHECKLIST.md`
