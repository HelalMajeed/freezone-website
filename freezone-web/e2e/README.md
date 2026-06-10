# FreeZone E2E smoke suite (Playwright)

End-to-end smoke tests for the storefront and the admin panel, ported from the
2026-06-10 global-launch QA pass into a repeatable, committed suite.

Covered flows: home rails (en/ar + RTL flip), category landing, PDP
(gallery / quantity / cart drawer), guest COD checkout with per-province fees,
inline Iraqi-phone validation, gateway "coming soon" honesty, order tracking,
customer reviews (pending + duplicate guard), customer accounts
(register/logout/wrong password), the admin panel (login form at `/admin`
— guards the route-hijack regression —, email + phone login,
`/dashboard/* → /admin/*` redirects, sign-out), and an axe-core accessibility
pass (`a11y.spec.ts`: home, listing, PDP, cart, checkout step 1, contact,
admin login, + Arabic RTL home/PDP — **critical** violations fail, **serious**
ones are logged as follow-up).

The suite is deliberately **separate** from vitest and the app build graph:

- `vitest.config.ts` only includes `src/**/*.test.ts` → vitest never picks up
  `e2e/*.spec.ts`;
- the root `tsconfig.json` only includes `src/**` + `vite.config.ts` → `tsc -b`
  never sweeps this directory (it has its own `tsconfig.json` for editors);
- `npm run lint` lints `src` only.

There is **no `webServer` auto-start** in `playwright.config.ts` and the suite
is **not wired into `npm run ci`**: it needs a seeded Postgres, the API and
Vite running (CI currently has neither a database nor browsers — wiring a
containerized job is future work).

## One-time prerequisites

- Playwright is already a devDependency of `freezone-web` (`playwright@1.49.x`)
  and the Chromium binary is in the shared cache. If it is missing on your
  machine: `npx playwright install chromium`.
- A local Postgres. The commands below use the repo's scratch instance on
  port `5544` (user `postgres`, trust auth) — adjust `DATABASE_URL` if yours
  differs.

## Database setup (fresh scratch DB)

From `freezone-api/` (PowerShell syntax; on bash export the vars instead):

```powershell
createdb -h localhost -p 5544 -U postgres freezone_e2e

$env:DATABASE_URL = 'postgresql://postgres@localhost:5544/freezone_e2e'
npx prisma migrate deploy        # 32 migrations
npx prisma db seed               # taxonomy/CMS/site config (wipe-and-reseed; prod-guarded)
npm run db:seed:demo             # 29 bilingual demo products (refuses production)

# Superadmin used by admin.spec.ts (script env vars: DASHBOARD_SEED_EMAIL,
# DASHBOARD_SEED_NAME, DASHBOARD_SEED_PASSWORD, ADMIN_PHONE; ADMIN_PASSWORD
# is honored as a fallback alias when DASHBOARD_SEED_PASSWORD is unset):
$env:DASHBOARD_SEED_EMAIL    = 'qa-admin@freezone-iq.com'
$env:DASHBOARD_SEED_NAME     = 'QA Admin'
$env:DASHBOARD_SEED_PASSWORD = 'Qa!Freezone2026#Smoke'
$env:ADMIN_PHONE             = '07712345678'
npx tsx prisma/seed-dashboard-superadmin.ts
```

Different admin credentials? Override the spec defaults with
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PHONE`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_NAME`.

## Start the servers

API on :4000 — **do not set `ADMIN_DIRECT_LOGIN`** (the admin specs assert the
credential form renders):

```powershell
# from freezone-api/
$env:DATABASE_URL = 'postgresql://postgres@localhost:5544/freezone_e2e'
npx tsx src/server.ts
```

Vite on :3010 (proxies `/api` + `/uploads` to :4000):

```powershell
# from freezone-web/
npx vite --port 3010
```

## Run

```powershell
# from freezone-web/
npm run test:e2e            # headless
npm run test:e2e:headed     # watch the browser
```

`E2E_BASE_URL` overrides the default `http://localhost:3010`.

## Cleanup / rerun caveats

- Specs **write data**: orders, customers and reviews are created on every
  run. They derive unique Iraqi phone numbers per run (wall clock + random
  suffix), so rerunning against the same DB stays green — but the DB
  accumulates test rows. Drop and re-seed (`dropdb`/`createdb` + the setup
  above) whenever you want a pristine baseline.
- The API's per-IP rate limits are **in-memory** (e.g. dashboard login
  5/10 min, customer register/login 5/10 min, orders 5/min). One suite run
  stays well under every budget, but many back-to-back reruns within the same
  window can trip 429s — restart the API to reset the counters.
- The suite runs with `workers: 1` on purpose (shared DB + shared rate-limit
  budgets); keep it serial.
- The checkout spec blocks `wa.me` / `*.whatsapp.com` so the WhatsApp handoff
  tab never makes external requests.
