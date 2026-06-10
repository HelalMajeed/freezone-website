# Security Review — Dashboard Access

_Last updated: 2026-06-10_

## Change under review

Restored **credentialed admin login** (email or Iraqi phone + password) and
made passwordless direct entry **non-production only** (fail-closed `403` when
`NODE_ENV=production`, regardless of `ADMIN_DIRECT_LOGIN`/`ADMIN_SKIP_AUTH`).
This reverses the passwordless-in-production decision of commit 06f25c6
(see `ASSUMPTIONS.md` A-1).

## Threat model & mitigations

| Threat | Mitigation |
|---|---|
| Public reaches `/dashboard` and gets admin in production | Direct login is impossible in production: `adminDirectLoginGate()` returns `403 DIRECT_LOGIN_DISABLED_IN_PRODUCTION` before any flag is consulted. Entry requires email/phone + password. |
| Credential brute force | Login rate-limited 5/10 min per IP; per-account lockout after 5 failures for 15 minutes; scrypt (N=16384, r=8, p=1) with timing-safe verify. |
| Account enumeration | Unknown identifier triggers a dummy scrypt verify and the same `401 INVALID_CREDENTIALS` as a wrong password. |
| Session theft / replay | Opaque 256-bit token, SHA-256-hashed in DB, httpOnly + SameSite cookie (`Secure` in production), 7-day TTL, revocable per-session and per-user (DB-backed — instant logout/lockout, unlike JWT). |
| Stray flag enabling open access in prod | Fail-closed by environment, not by configuration: `NODE_ENV=production` disables direct login unconditionally; the flags only emit a startup warning. The old relaxation of the `ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET` startup checks no longer applies in production. |
| Untraceable logins | Audit log records `auth.login`, `auth.login-failed` (with reason), `auth.logout` and `auth.direct-login` — each with actor, ip and user-agent. Passwords are never logged. |

## Residual risks

- Direct entry in non-production environments is intentionally open when
  `ADMIN_DIRECT_LOGIN=true` — never set that flag on an internet-reachable
  staging host without edge protection (Cloudflare Access / IP allowlist).
- The legacy `/api/admin/login` endpoint (shared `ADMIN_PASSWORD`, HMAC cookie)
  still exists; its cookie is only honored behind `LEGACY_ADMIN_COOKIE=true`
  and is read-only for mutations. Production startup requires
  `ADMIN_REQUIRE_PASSWORD=true` + a strong `ADMIN_PASSWORD`.
- Deploy prerequisite: production Fly secrets must include
  `ADMIN_SESSION_SECRET`, `ADMIN_REQUIRE_PASSWORD=true` and `ADMIN_PASSWORD` —
  the API now refuses to boot in production without them even when
  `ADMIN_DIRECT_LOGIN=true` is set.

## Verification

- Backend unit tests: `freezone-api/src/lib/admin-direct-login.test.ts`
  (flag gating + production fail-closed) and
  `freezone-api/src/lib/phone.test.ts` (identifier normalization).
- Frontend: `/dashboard/login` attempts direct entry once, then renders the
  bilingual credential form on refusal (`freezone-web/src/app/dashboard/LoginPage.tsx`).
