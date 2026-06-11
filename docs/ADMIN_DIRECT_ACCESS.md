# Admin Access — Credentialed Login (production) + Direct Entry (dev only)

_Last updated: 2026-06-10 (global-launch sprint). This reverses the
passwordless-in-production decision of commit 06f25c6 — see `ASSUMPTIONS.md`
A-1._

## Production: email or phone + password

- `/dashboard/login` renders a credential form: **email or Iraqi phone
  (`07XXXXXXXXX`)** + password.
- `POST /api/dashboard/auth/login` accepts `{ identifier, password }` — the
  identifier is an email (contains `@`) or an Iraqi phone (Arabic-indic digits
  and `+964`/`00964`/`964` prefixes are normalized via
  `freezone-api/src/lib/phone.ts`). The legacy `{ email, password }` body still
  works.
- Protections: rate limit 5/10 min per IP, scrypt verify (timing-resistant
  dummy verify for unknown identifiers), 5-failure/15-minute account lockout.
- Sessions are DB-backed opaque cookies (`fz_dashboard_session`), revocable,
  7-day TTL.
- Audit log records `auth.login` (success), `auth.login-failed` (failure
  reason, never the password) and `auth.logout` — each with ip + user-agent.

## Non-production: passwordless direct entry (dev convenience)

| Var | Purpose |
|---|---|
| `ADMIN_DIRECT_LOGIN` (or `ADMIN_SKIP_AUTH`) | `true` enables passwordless direct entry — **non-production only**. Off by default. |

1. Opening `/dashboard` or `/dashboard/login` calls
   `POST /api/dashboard/auth/direct-login` once.
2. When enabled (and `NODE_ENV !== "production"`), it creates a SUPER_ADMIN
   session and the UI lands on `/dashboard` with a brief "Opening dashboard…"
   state.
3. When refused, the login page falls back to the credential form.

| Situation | Result |
|---|---|
| non-prod, flag on | auto-enters, lands on `/dashboard` |
| non-prod, flag off | `403 DIRECT_LOGIN_DISABLED` → credential form |
| **production (any flags)** | `403 DIRECT_LOGIN_DISABLED_IN_PRODUCTION` → credential form |

Direct login **fails closed in production regardless of env flags** — setting
`ADMIN_DIRECT_LOGIN=true` on Fly only produces a startup warning. Production
startup also requires `ADMIN_SESSION_SECRET` (≥32 chars),
`ADMIN_REQUIRE_PASSWORD=true` and a strong `ADMIN_PASSWORD` (the direct-login
relaxation of those checks no longer applies in production — see
`freezone-api/src/lib/admin-secrets.ts`).

## Seeding the first admin

```bash
DASHBOARD_SEED_EMAIL=admin@freezone-iq.com \
DASHBOARD_SEED_NAME="Site Owner" \
DASHBOARD_SEED_PASSWORD="<strong password>" \
ADMIN_PHONE=07712345678 \
  npx tsx prisma/seed-dashboard-superadmin.ts
```

`ADMIN_PHONE` is optional, validated as an Iraqi mobile, and updated on rerun.
Existing admins without a phone sign in with their email.
