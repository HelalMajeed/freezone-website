# Freezone Dashboard

The official management panel for the Freezone storefront, mounted at **`/dashboard`**. The legacy `/admin` UI has been **removed** — `/admin` and `/admin/*` now redirect to `/dashboard/login`.

## What you get

- 🔐 **Real user accounts with roles** — superadmin / admin / editor / viewer (replaces the old single shared password)
- 🛡️ **Server-side sessions** — DB-backed, revocable on the spot, brute-force locked after 5 failed attempts
- 🔑 **scrypt password hashing** — OWASP-recommended, no extra dependencies (Node built-in)
- 🌐 **Bilingual UI** — Arabic (RTL) + English (LTR), language toggle per user
- 📊 **Rich overview** — live KPIs, 14-day revenue sparkline, order status breakdown, low-stock alerts, top sellers, recent orders
- 👥 **Team management** — create/edit/delete users, lock/unlock accounts, password rotation invalidates sessions
- 📝 **Activity audit log** — every dashboard write is logged
- 🎨 **Brand-aligned design** — Freezone crimson (#C90000), polished CSS Modules, no Tailwind dependency
- 🔄 **API reuse** — calls the existing `/api/admin/*` endpoints (the dashboard login sets both `fz_dashboard_session` and the legacy `fz_admin_session` cookie so those routes work unchanged). API alignment to `/api/dashboard/*` is a follow-up cleanup.

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
| `pages/dashboard/ComingSoon.tsx` | Placeholder used only by `/dashboard/cms` (full CMS editor pending) |
| `pages/dashboard/BrandsPage.tsx` | Brands CRUD + logo upload |
| `pages/dashboard/ProductsPage.tsx` + `products/` | Products list, filters, pagination, create/edit, image gallery, duplicate, soft-delete |
| `pages/dashboard/CategoriesPage.tsx` + `categories/` | Category tree, hierarchy display, CRUD with image, active toggle |
| `pages/dashboard/OrdersPage.tsx` | Orders list, status filters, detail drawer, status updates |
| `pages/dashboard/CouponsPage.tsx` | Coupons CRUD (percent / fixed) with validity, usage limits, min-subtotal |
| `pages/dashboard/MediaPage.tsx` | Media library grid: upload, search, edit metadata, delete |
| `pages/dashboard/SettingsPage.tsx` | Brand, contact, shipping, payment, promo, SEO, maintenance toggle |
| `pages/dashboard/DesignPage.tsx` | Theme tokens editor (colors, fonts, radii, button style) with live preview |
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

## Legacy `/admin` removal — done

The old `/admin` UI has been deleted. `/admin` and `/admin/*` redirect to `/dashboard/login`. The standalone `apps/admin-vite/` deployment is also removed.

**Kept intentionally:**
- The `/api/admin/*` backend routes (the new dashboard still calls them; alignment to `/api/dashboard/*` is queued).
- `freezone-api/src/lib/admin-session.ts` and friends (the legacy cookie bridge — dashboard login sets that cookie too so the admin routes accept it without refactor).
- CI workflows (`.github/workflows/import-globaliraq.yml`, `daily-summary.yml`) that POST `/api/admin/login` for unattended runs.

---

## Module status

| Module | State | Notes |
|---|---|---|
| Overview | ✅ Implemented | KPIs, sparkline, recent orders, top sellers, low stock |
| Login / Profile / Users / Audit | ✅ Implemented | Original dashboard work |
| Brands | ✅ Implemented | CRUD + logo upload |
| Products | ✅ Implemented | List, filters, pagination, create/edit, image gallery, duplicate, soft-delete |
| Categories | ✅ Implemented | Tree editor, image, active toggle |
| Orders | ✅ Implemented | List, filters, detail drawer, status updates |
| Coupons | ✅ Implemented | CRUD; backend `PATCH`/`DELETE` added |
| Media library | ✅ Implemented | Grid, upload, search, edit metadata, delete |
| Settings | ✅ Implemented | New `/api/admin/site-config` endpoint covers brand, contact, shipping, payment, promo, SEO, maintenance |
| Design & theme | ✅ Implemented | `SiteConfig.themeTokens` editor with live preview |
| CMS / Pages | ✅ Implemented (partial) | Tabs for promo banners, social links, trust bar, home spotlights. New per-entity endpoints under `/api/admin/{promo-banners,social-links,trust-bar,home-spotlights}`. **Pending:** hero slides editor + showroom media gallery (each needs a dedicated complex sub-editor). |

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
