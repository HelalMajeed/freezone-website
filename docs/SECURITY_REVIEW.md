# Security Review — Dashboard Access

_Last updated: 2026-06-08_

## Change under review

Replaced the previously **open** passwordless dashboard entry (anyone reaching
`/dashboard` became SUPER_ADMIN) with **secret-link-only** access.

## Threat model & mitigations

| Threat | Mitigation |
|---|---|
| Public reaches `/dashboard` and gets admin | No session is created without a valid secret key. `/dashboard` without a session → redirect to login; login without `key` → no API call, no session. |
| Token guessing / brute force | Token is 32 random bytes (base64url, ~256 bits). Compared **constant-time** (`timingSafeEqual`). The public order/track + login endpoints already have rate limits; direct-login returns a uniform `403` for missing/invalid keys. |
| Token leakage via referrer | Key is stripped from the URL immediately after success (router `replace`). Response is `Cache-Control: no-store`. Recommend `Referrer-Policy: no-referrer` at the edge. |
| Token in logs | Key is never logged; the API never echoes the expected value. Audit log records only `auth.secret-link-login` with the admin email, not the token. |
| Stray flag enabling open access in prod | Fail-closed: production requires `ADMIN_DIRECT_LOGIN=true` **and** a configured token **and** `ADMIN_DIRECT_LOGIN_PRODUCTION_ACK=true`. Missing any → `403`. |
| Token compromise | Rotate via `ADMIN_DIRECT_LINK_TOKEN`; old links die instantly. |

## Residual risks

- A secret in a URL is bookmarkable but can be shoulder-surfed or synced to an
  untrusted device. **Recommended:** add Cloudflare Access or an IP allowlist in
  front of `/dashboard` + `/api/dashboard` (see `docs/ADMIN_DIRECT_ACCESS.md`).
- The legacy username/password login endpoint (`/api/dashboard/auth/login`) still
  exists server-side (no UI). It is rate-limited and scrypt/argon2-hashed. Keep
  the seeded credentials strong or disable that route if undesired.

## Verification

- Backend unit tests: `freezone-api/src/lib/admin-direct-login.test.ts`
  (gate states + constant-time token verify, plain & hash).
- Frontend unit tests: `freezone-web/src/lib/dashboard/secret-link.test.ts`
  (key extraction + URL stripping).
- Live checks recorded in `docs/AUTO_DEPLOYMENT_LOG.md`.
