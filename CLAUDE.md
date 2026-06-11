# CLAUDE.md — FreeZone ([freezone-iq.com](http://freezone-iq.com))

Persistent project rules. Claude Code reads this file automatically at the start of EVERY session. Follow it in every task, including multi-agent sprints — subagents inherit these rules too.

## 1. What this project is

- **FreeZone** — electronics & tech e-commerce store for the Iraqi market with global ambitions: CCTV & security, computers & laptops, gaming, networking, smart home, power solutions (UPS/solar/inverters), mobiles.
- Live domain: `https://freezone-iq.com` with `/ar` (primary) and `/en` routes.
- Monorepo: **Backend** = Express + Prisma + PostgreSQL. **Frontend** = Vite + React (SPA).
- Currency: IQD (integer, no decimals). Customers identified primarily by **phone number** (format `07XXXXXXXXX`), email optional.
- On first run in a fresh session: verify actual folder names, scripts, and ports from the root `package.json` files before assuming anything. Update the Commands section below if it drifts from reality.

## 2. Golden rules (never violate)

1. **Inspect before changing.** Read the relevant files first. Never assume a file, model, route, or script exists.
2. **Minimal diffs.** Do not refactor, rename, or "clean up" working code unless the task explicitly asks for it.
3. **Build gates before every commit:** frontend `npm run build` passes, backend builds/starts, no new TypeScript or lint errors.
4. **Never commit secrets.** All credentials via env vars. New env vars must be added to `.env.example` with a comment. `.env` stays out of git.
5. **No fake integrations.** External services (ZainCash, QiCard, FIB, GA4, Meta Pixel, card gateways) are real adapters gated by env keys; without keys they are disabled/`NotConfiguredError` — never silently simulated success.
6. **Destructive operations** (dropping tables, deleting migrations, force-push, mass file deletion) require explicit confirmation from the developer first.
7. When information is missing, make a reasonable production-grade assumption, log it in `ASSUMPTIONS.md`, and continue — don't stall, don't invent project facts.

## 3. Language & communication

- All **UI strings** go through i18n (`react-i18next`): Arabic = default + RTL (`dir="rtl"`), English = secondary. **No hardcoded user-facing text in components.** New strings are added to BOTH `ar` and `en` files in the same commit.
- All **code, comments, commit messages, and docs** in English.
- Reply to the developer in Arabic when he writes in Arabic.

## 4. Database (Prisma + PostgreSQL)

- Schema changes via `prisma migrate dev --name <change>` — never `db push` on this project, never edit applied migration files.
- Prisma Client for all queries. No raw SQL string interpolation; if raw is unavoidable, use parameterized `$queryRaw` tagged templates.
- Money fields are `Int` IQD. Stock changes happen inside `prisma.$transaction`.
- Every new model gets `createdAt DateTime @default(now())`.

## 5. Backend conventions (Express)

- Every endpoint validates input with **zod** (body, query, params) before touching the DB.
- Route protection: `requireAuth` + `requireRole('ADMIN')` on **every** `/api/admin/`* route — authorization is checked server-side on each request, never trusted from the client.
- Auth: bcrypt (cost ≥ 10), short-lived JWT access token + httpOnly secure refresh cookie. Login endpoints are rate-limited and failures are written to `AuditLog`.
- Global middleware stack: helmet, CORS locked to site origins, compression, rate limiting (stricter on auth/checkout/tracking), structured request logging.
- Errors: consistent JSON shape `{ error: { code, message } }`; no stack traces in production responses.
- Admin mutations (product/order/status/settings changes) write an `AuditLog` row.

## 6. Frontend conventions (Vite + React)

- Theme: primary red `#C90000`, RTL-aware layout, mobile-first (most Iraqi traffic is mobile).
- Heavy route bundles (`/admin`, checkout) are code-split with `React.lazy`.
- Images: `loading="lazy"` + explicit width/height. Local assets only — no hotlinking external images.
- Every page renders loading skeletons, error boundaries, and empty states. Unknown slugs show the custom 404 (and the server returns HTTP 404).
- Cart state persists to localStorage. Guest checkout is always possible — never force account creation to buy.

## 7. SEO (standing requirement — the SPA must stay crawlable)

- Public meta is **server-injected** by Express middleware into `index.html` per route: title, description, canonical, OG/Twitter, `hreflang` (ar/en/x-default), JSON-LD (`Product` on product pages, `BreadcrumbList`, `Organization`/`WebSite` on root). `react-helmet-async` mirrors it client-side.
- Any NEW public page added in any task must ship with: server-injected meta + entry in the dynamic `/sitemap.xml` + bilingual content. Not optional.
- `/admin` and `/api` are excluded from sitemap, disallowed in `robots.txt`, and served with `X-Robots-Tag: noindex`.

## 8. Commands (verify on first run; correct here if different)

```bash
# backend
npm install            # in backend folder
npx prisma migrate dev
npx prisma db seed
npm run dev            # dev server
npm run build          # build gate

# frontend
npm install            # in frontend folder
npm run dev
npm run build          # build gate

```

## 9. Git workflow

- Feature branches: `feat/<scope>`, fixes: `fix/<scope>`. Never commit directly to the default branch.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`). One logical change per commit; builds pass at every commit.
- Never force-push, never amend pushed commits, never touch git history without explicit approval.

## 10. Definition of done (any task)

A task is done only when: builds pass on a fresh `install → migrate → seed → run`, the affected flow works in BOTH Arabic and English without broken pages, admin-facing changes are operable from `/admin`, new endpoints are validated + authorized + in `API_CONTRACT.md`, and nothing that previously worked is broken.