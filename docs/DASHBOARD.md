# Freezone Dashboard — New Admin Panel

A modern, role-based admin dashboard built from scratch for the Freezone storefront. Mounted at **`/dashboard`** alongside the legacy `/admin` so rollout has zero downtime.

## What you get

- 🔐 **Real user accounts with roles** — superadmin / admin / editor / viewer (replaces the old single shared password)
- 🛡️ **Server-side sessions** — DB-backed, revocable on the spot, brute-force locked after 5 failed attempts
- 🔑 **scrypt password hashing** — OWASP-recommended, no extra dependencies (Node built-in)
- 🌐 **Bilingual UI** — Arabic (RTL) + English (LTR), language toggle per user
- 📊 **Rich overview** — live KPIs, 14-day revenue sparkline, order status breakdown, low-stock alerts, top sellers, recent orders
- 👥 **Team management** — create/edit/delete users, lock/unlock accounts, password rotation invalidates sessions
- 📝 **Activity audit log** — every dashboard write is logged
- 🎨 **Brand-aligned design** — Freezone crimson (#C90000), polished CSS Modules, no Tailwind dependency
- 🔄 **Backward compatible** — sets the legacy `fz_admin_session` cookie too, so existing `/api/admin/*` routes work unchanged for the new dashboard's users

---

## Apply the changes

### 1. Install (no new packages needed)

The build uses only what's already in `package.json`: Prisma, Express, React, zustand, i18next, react-router-dom. **No new dependencies.**

If you copied files manually, just make sure Prisma regenerates:

```bash
cd freezone-api
npx prisma generate
```

### 2. Run the migration

A new migration `20260521120000_dashboard_users` adds the `AdminUser` and `AdminSession` tables.

```bash
cd freezone-api
npx prisma migrate deploy
```

### 3. Create your first superadmin

```bash
cd freezone-api

# With defaults (CHANGE THE PASSWORD IMMEDIATELY AFTER LOGIN):
npm run db:seed:dashboard

# Or with your own values:
DASHBOARD_SEED_EMAIL="you@freezone-iq.com" \
DASHBOARD_SEED_NAME="Your Name" \
DASHBOARD_SEED_PASSWORD="a-strong-password-here" \
  npm run db:seed:dashboard
```

Defaults (if no env vars):

| Field | Default |
|---|---|
| Email | `admin@freezone-iq.com` |
| Name | `Site Owner` |
| Password | `ChangeMe!2026` ← **rotate immediately** |

The seed is idempotent — running again upgrades an existing user to superadmin and resets the password.

### 4. Visit the new dashboard

```
http://localhost:3000/dashboard/login
```

After login, you land on the overview page. The user menu (top-right) has language toggle, profile (change own password), and logout.

---

## File map

### Backend (`freezone-api/`)

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Added `AdminUser` + `AdminSession` models |
| `prisma/migrations/20260521120000_dashboard_users/migration.sql` | DDL for new tables |
| `prisma/seed-dashboard-superadmin.ts` | First-superadmin seed script |
| `src/lib/dashboard-auth.ts` | scrypt hashing, session create/validate, cookies, brute-force lock |
| `src/lib/dashboard-guard.ts` | Route guards by role, `jsonOk`/`jsonError` helpers |
| `src/app/api/dashboard/auth/login/route.ts` | POST login — issues both new + legacy cookies |
| `src/app/api/dashboard/auth/logout/route.ts` | POST logout — revokes session, clears both cookies |
| `src/app/api/dashboard/auth/me/route.ts` | GET current user |
| `src/app/api/dashboard/auth/change-password/route.ts` | POST self password change |
| `src/app/api/dashboard/users/route.ts` | GET list / POST create (superadmin) |
| `src/app/api/dashboard/users/[id]/route.ts` | GET / PATCH / DELETE (superadmin) |
| `src/app/api/dashboard/overview/route.ts` | GET aggregated KPIs + sparkline |
| `src/app/api/dashboard/audit/route.ts` | GET paginated audit log |
| `src/server.ts` | Mounts all `/api/dashboard/*` routes (existing routes untouched) |

### Frontend (`freezone-web/src/`)

| File | Purpose |
|---|---|
| `app/dashboard/dashboard-shell.css` | Design tokens (CSS variables for brand, neutrals, layout) |
| `app/dashboard/LoginPage.tsx` + `login.module.css` | Login screen with brand panel |
| `lib/dashboard/api.ts` | Typed fetch wrapper with credentials + error class |
| `lib/dashboard/auth-store.ts` | Zustand store: current user, login, logout, role check |
| `components/dashboard/DashboardLayout.tsx` + `layout.module.css` | Sidebar + topbar + content shell |
| `components/dashboard/DashboardGuard.tsx` | Auth gate, redirects to login |
| `components/dashboard/ui/index.tsx` + `ui.module.css` | Button, Input, Field, Card, Badge, Table, Modal, Avatar |
| `pages/dashboard/OverviewPage.tsx` + `Overview.module.css` | Home: KPIs + sparkline + recent orders + top sellers + low stock |
| `pages/dashboard/UsersPage.tsx` | Team management CRUD |
| `pages/dashboard/ProfilePage.tsx` | Own profile + change password |
| `pages/dashboard/AuditPage.tsx` | Activity log viewer |
| `pages/dashboard/ComingSoon.tsx` | Placeholders for Phase 2 modules (links to legacy `/admin`) |
| `routes/dashboard-routes.tsx` | Route branch — exported as `freezoneDashboardRouteBranch` |
| `App.tsx` | Mounts the branch (1-line patch) |
| `main.tsx` | Imports the dashboard CSS (1-line patch) |

---

## Role matrix

| Action | viewer | editor | admin | superadmin |
|---|:-:|:-:|:-:|:-:|
| View dashboard, overview, content | ✓ | ✓ | ✓ | ✓ |
| Edit own password | ✓ | ✓ | ✓ | ✓ |
| Edit products / categories / brands / CMS / media (Phase 2) | — | ✓ | ✓ | ✓ |
| Manage orders / coupons / site settings (Phase 2) | — | — | ✓ | ✓ |
| Manage team / roles / sessions | — | — | — | ✓ |

Role floor is enforced server-side in `guardDashboard(req, "minRole")` — the UI hides items you can't reach, but the server is the source of truth.

---

## Security notes

- **Passwords** never stored plaintext. Stored format: `scrypt$N$r$p$saltB64$hashB64` (N=16384, r=8, p=1, 64-byte key).
- **Session tokens** never stored — only their SHA-256 hash. Cookie contains a 256-bit random opaque token. Stolen DB ≠ stolen sessions.
- **Brute-force lock** — 5 failed logins → account locked 15 minutes. Superadmin can unlock from the Users page.
- **Session rotation** — changing your password or being disabled by a superadmin invalidates all your existing sessions.
- **Cookie flags** — `HttpOnly`, `SameSite=Lax` (override with `DASHBOARD_COOKIE_SAMESITE`), `Secure` in production.
- **Timing attack defence** — login does a dummy verify when the user doesn't exist, so response time doesn't leak email validity.

---

## Deleting the legacy `/admin` (later)

The new dashboard runs **side-by-side** with the old `/admin` so you can verify everything works first. When you're ready to remove the legacy panel:

1. Delete `freezone-web/src/app/admin/` and `freezone-web/src/components/admin/` and `freezone-web/src/pages/admin/`
2. Delete `freezone-web/src/routes/admin-panel-routes.tsx`
3. Remove the `freezoneAdminRouteBranch` import + usage from `App.tsx`
4. Remove the `@/app/admin/admin-shell.css` import from `main.tsx`
5. Leave the API `/api/admin/*` routes — the new dashboard reuses them
6. Leave `freezone-api/src/lib/admin-session.ts` — the legacy cookie bridge still uses `signAdminSession`

The `apps/admin-vite/` and `commerce-suite/admin-web/` folders are independent — delete or keep per your call.

---

## Phase 2 — what's next

The `Coming soon` pages show the modules still to be built. Each ComingSoon stub links to the legacy `/admin/*` page that still handles that job today. Phase 2 modules (in suggested order):

1. **Products** — full CRUD with variants, images, attribute values, secondary categories, specs editor, bulk actions
2. **Categories** — tree editor with drag-reorder, per-category attribute schema (filterable / searchable / comparable), hero images
3. **Brands** — simple list with logo upload
4. **Orders** — list + detail view + status updates (uses existing `/api/admin/orders`)
5. **Coupons** — CRUD against the `Coupon` model
6. **CMS** — drag-drop homepage builder (hero slides, ticker, trust bar, featured products, FAQ, promo grid)
7. **Media library** — uploads + alt text + usage tracking
8. **Design & theme** — `SiteConfig.themeTokens` editor with live preview
9. **Site settings** — the big `SiteConfig` form (store info, shipping, payment, navbar, SEO)

Each module will be **a single focused PR** that adds:
- A new page under `freezone-web/src/pages/dashboard/`
- A route entry in `routes/dashboard-routes.tsx` (replacing the `ComingSoon` stub)
- Optionally new helper API routes under `/api/dashboard/*` if the existing `/api/admin/*` is missing a piece

---

## Quick reference — API endpoints

```
POST   /api/dashboard/auth/login              { email, password }
POST   /api/dashboard/auth/logout
GET    /api/dashboard/auth/me
POST   /api/dashboard/auth/change-password    { currentPassword, newPassword }

GET    /api/dashboard/overview                 KPIs + sparkline + recent orders
GET    /api/dashboard/audit?limit&cursor       Paginated audit log

GET    /api/dashboard/users                    Superadmin: list
POST   /api/dashboard/users                    Superadmin: create
GET    /api/dashboard/users/:id                Superadmin: detail + sessions
PATCH  /api/dashboard/users/:id                Superadmin: update / reset password / unlock
DELETE /api/dashboard/users/:id                Superadmin: delete
```

All return `{ ok: true, data: ... }` on success and `{ ok: false, error: "CODE" }` on failure.
