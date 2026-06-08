# Admin Direct Access — Passwordless Direct Entry

The dashboard (`/dashboard`) has **no username/password** and **no secret key**.
Opening the dashboard signs the user straight in.

## How it works

1. Visiting `/dashboard` or `/dashboard/login` calls
   `POST /api/dashboard/auth/direct-login` (no body, no key).
2. When the API has direct entry enabled, it creates a SUPER_ADMIN session
   (cookie) and the UI lands the user on `/dashboard`.
3. `/dashboard/login` shows only a brief "Opening dashboard…" state.

| Situation | Result |
|---|---|
| `/dashboard` (no session) | redirected to `/dashboard/login`, which auto-enters |
| `/dashboard/login` | auto-enters, lands on `/dashboard` |
| direct login disabled on server | `403 DIRECT_LOGIN_DISABLED`; UI shows a "turned off" message |

## Environment

| Var | Purpose |
|---|---|
| `ADMIN_DIRECT_LOGIN` (or `ADMIN_SKIP_AUTH`) | `true` enables passwordless direct entry. Off by default. |

No token / ACK is required. (`ADMIN_DIRECT_LINK_TOKEN` and the secret-link flow
were removed.)

## ⚠️ Security

With direct entry on, **anyone who reaches `/dashboard` becomes SUPER_ADMIN**
(products, orders, customer data, pricing). This is an explicit owner choice.

- **To disable:** `flyctl secrets unset ADMIN_DIRECT_LOGIN -a freezone-website`
- **Strongly recommended:** put **Cloudflare Access** or an **IP allowlist** in
  front of `/dashboard` + `/api/dashboard` for protection without re-introducing
  a login prompt.
