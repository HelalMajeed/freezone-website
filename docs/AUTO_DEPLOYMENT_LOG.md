# Auto Deployment Log

## 2026-06-08 — Secret-link admin access

**Commit:** `237d752` feat(auth): secure dashboard direct access with secret link
**Deploy run:** Deploy production `27109438623` — success (Fly API + Netlify)
**Secrets (staged then applied by the deploy):** `ADMIN_DIRECT_LOGIN=true`,
`ADMIN_DIRECT_LINK_TOKEN=<secret, not recorded here>`,
`ADMIN_DIRECT_LOGIN_PRODUCTION_ACK=true`

**Pre-deploy checks**
- freezone-api: `npm run build` ✓ · `npm test` 109/109 ✓ (9 new secret-link tests)
- freezone-web: `npm run lint` ✓ · `npx tsc -b` ✓ · `npm test` 10/10 ✓ · `npm run build` + prerender ✓

**Live verification (`https://freezone-website.fly.dev` / `https://freezone-iq.com`)**
| Check | Result |
|---|---|
| `POST /api/dashboard/auth/direct-login` no key | `403 DIRECT_LOGIN_TOKEN_REQUIRED`, no cookie, `Cache-Control: no-store` |
| same, wrong key | `403 DIRECT_LOGIN_TOKEN_INVALID`, no cookie |
| same, correct key (body) | `200`, `fz_dashboard_session` set, SUPER_ADMIN, `no-store` |
| same, correct key (query param) | `200` |
| `/dashboard/login` | `200` |
| `/en/` storefront | `200` |

**Result:** The previously open passwordless entry is closed. Dashboard access is
now secret-link only. Token delivered to the owner out-of-band (not in git).
