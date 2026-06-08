# Admin Direct Access — Secret Link

The dashboard (`/dashboard`) has **no username/password form**. The only way to
obtain an admin session is a **private link** that carries a secret token.

## How it works

```
https://freezone-iq.com/dashboard/login?key=<ADMIN_DIRECT_LINK_TOKEN>
```

1. The login page reads `key` from the URL and calls
   `POST /api/dashboard/auth/direct-login` with the key.
2. The API verifies the key **server-side** (constant-time compare) and only
   then creates the dashboard session cookie (and a legacy admin cookie).
3. The login page **strips the key from the address bar** (router `replace`) and
   sends the user to `/dashboard`.

Opening `/dashboard` or `/dashboard/login` **without** the key never creates a
session:

| Situation | Result |
|---|---|
| `/dashboard` without session | redirected to `/dashboard/login` (no session) |
| `/dashboard/login` without `key` | "private access link required" — no session, no API call |
| `/dashboard/login?key=<wrong>` | clean error, `403`, no session, secret never shown |
| `/dashboard/login?key=<correct>` | session created, redirected to `/dashboard`, key removed from URL |

## Environment variables

| Var | Purpose |
|---|---|
| `ADMIN_DIRECT_LOGIN` | feature switch — must be `true` |
| `ADMIN_DIRECT_LINK_TOKEN` | the secret carried by the link |
| `ADMIN_DIRECT_LINK_TOKEN_HASH` | optional: store only the `sha256` hex of the token instead of the plaintext |
| `ADMIN_DIRECT_LOGIN_PRODUCTION_ACK` | **required `true` in production** (explicit acknowledgement) |

**Fail-closed:** if the feature is enabled but no token is configured, or (in
production) the ACK is missing, the endpoint returns `403` and issues nothing.

The key may be supplied as the query param `key`, a JSON body `{ "key": "..." }`,
or the header `x-admin-direct-key`.

## Generating / rotating the token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Set it as a secret (never commit a real value):

```bash
flyctl secrets set ADMIN_DIRECT_LINK_TOKEN=<token> ADMIN_DIRECT_LOGIN=true ADMIN_DIRECT_LOGIN_PRODUCTION_ACK=true -a freezone-website
```

**Rotate** access by setting a new `ADMIN_DIRECT_LINK_TOKEN`; the old link stops
working immediately. To **disable** direct access entirely:

```bash
flyctl secrets unset ADMIN_DIRECT_LOGIN ADMIN_DIRECT_LINK_TOKEN ADMIN_DIRECT_LOGIN_PRODUCTION_ACK -a freezone-website
```

## Handling the secret link

- Keep the full link in a **password manager** or browser bookmark.
- Do **not** put a real token in git, docs, README, screenshots, or logs.
- The token is never written to server logs and never returned by the API.

## Recommended future hardening

A secret in a URL is reasonable protection for a single owner, but it is weaker
than edge auth. Prefer, in front of `/dashboard` and `/api/dashboard`:

- **Cloudflare Access** (Zero Trust) — identity-based gate, or
- an **IP allowlist** at the edge (Netlify/Cloudflare/Fly).

These can be layered on top of the secret link without code changes.
