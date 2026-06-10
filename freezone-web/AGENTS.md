# freezone-web

This package is a **Vite 7 + React 19 single-page app** — NOT Next.js. Ignore
Next.js conventions; the `"use client"` pragmas and `app/`-style folders are
historical leftovers from a migration and have no framework meaning here.

- Routing: React Router 7 (`src/routes/`), locale-prefixed paths (`/en`, `/ar`)
  with first-class RTL support.
- Build: `npm run build` = `tsc -b && vite build`; the `postbuild` step runs
  `scripts/prerender.mjs` (build-time meta/JSON-LD shells). Set
  `PRERENDER_SKIP=1` to skip prerendering locally.
- Checks: `npx tsc -b`, `npm run lint` (eslint), `npm test` (vitest).
- i18n: every user-facing string needs keys in BOTH `src/messages/en.json` and
  `src/messages/ar.json` (storefront) or `src/lib/dashboard/i18n/{en,ar}.ts`
  (dashboard).
- API: the Express backend lives in `../freezone-api`; client fetches go
  through the helpers in `src/lib/api-internal.ts` (dev proxies `/api` and
  `/uploads` to port 4000).
