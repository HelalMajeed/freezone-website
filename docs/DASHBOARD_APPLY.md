# كيف تطبّق هذه التغييرات على المستودع

هذا المجلد فيه كل الملفات التي تحتاج لإضافتها أو استبدالها في مستودع `freezone-website`.
يحافظ على **توافق كامل**: اللوحة القديمة `/admin` تستمر بالعمل، والجديدة `/dashboard` تشتغل بجانبها.

---

## How to apply these changes

This folder contains every file you need to add or overwrite in `freezone-website`.
Fully backward-compatible: the legacy `/admin` keeps working, the new `/dashboard` runs alongside it.

### Quick path (recommended)

If you cloned this folder next to your repo:

```bash
# from inside freezone-website root
cp -r ../freezone-dashboard/* .
cd freezone-api
npm install                                       # no new deps; ensures prisma generate runs
npx prisma migrate deploy                         # applies the dashboard_users migration
npm run db:seed:dashboard                         # creates first superadmin
npm run dev                                        # or your usual dev command
```

Then open: **http://localhost:3000/dashboard/login**

Default credentials (override via env vars when running seed):
- Email: `admin@freezone-iq.com`
- Password: `ChangeMe!2026`  ← **rotate immediately via Profile page**

### Manual file map (if you prefer to inspect each diff)

#### New files (just copy in — they won't collide with anything existing):

```
freezone-api/src/lib/dashboard-auth.ts
freezone-api/src/lib/dashboard-guard.ts
freezone-api/src/app/api/dashboard/auth/login/route.ts
freezone-api/src/app/api/dashboard/auth/logout/route.ts
freezone-api/src/app/api/dashboard/auth/me/route.ts
freezone-api/src/app/api/dashboard/auth/change-password/route.ts
freezone-api/src/app/api/dashboard/users/route.ts
freezone-api/src/app/api/dashboard/users/[id]/route.ts
freezone-api/src/app/api/dashboard/overview/route.ts
freezone-api/src/app/api/dashboard/audit/route.ts
freezone-api/prisma/seed-dashboard-superadmin.ts
freezone-api/prisma/migrations/20260521120000_dashboard_users/migration.sql
freezone-web/src/app/dashboard/dashboard-shell.css
freezone-web/src/app/dashboard/LoginPage.tsx
freezone-web/src/app/dashboard/login.module.css
freezone-web/src/components/dashboard/DashboardLayout.tsx
freezone-web/src/components/dashboard/DashboardGuard.tsx
freezone-web/src/components/dashboard/layout.module.css
freezone-web/src/components/dashboard/ui/index.tsx
freezone-web/src/components/dashboard/ui/ui.module.css
freezone-web/src/lib/dashboard/api.ts
freezone-web/src/lib/dashboard/auth-store.ts
freezone-web/src/pages/dashboard/OverviewPage.tsx
freezone-web/src/pages/dashboard/Overview.module.css
freezone-web/src/pages/dashboard/UsersPage.tsx
freezone-web/src/pages/dashboard/ProfilePage.tsx
freezone-web/src/pages/dashboard/AuditPage.tsx
freezone-web/src/pages/dashboard/ComingSoon.tsx
freezone-web/src/routes/dashboard-routes.tsx
DASHBOARD.md
```

#### Files modified (overwrite the existing ones):

| File | What changed |
|---|---|
| `freezone-api/prisma/schema.prisma` | Appended `AdminUser` + `AdminSession` models (at end of file, after `CmsPageSection`) |
| `freezone-api/src/server.ts` | Added imports for dashboard route modules + 12 new `app.*` route mounts |
| `freezone-api/package.json` | Added one script: `"db:seed:dashboard": "tsx prisma/seed-dashboard-superadmin.ts"` |
| `freezone-web/src/App.tsx` | Two lines: import + mount `freezoneDashboardRouteBranch` |
| `freezone-web/src/main.tsx` | One line: import `@/app/dashboard/dashboard-shell.css` |

No other files in your repo are touched. The legacy admin under `/admin` and `apps/admin-vite/` and `commerce-suite/` are untouched.

---

## بالعربي — خطوات التطبيق السريعة

١. انسخ هذا المجلد فوق مستودعك:
```bash
cp -r ../freezone-dashboard/* .
```

٢. شغّل المايغريشن:
```bash
cd freezone-api
npx prisma migrate deploy
```

٣. أنشئ أول مدير (Superadmin):
```bash
npm run db:seed:dashboard
```

٤. شغّل المشروع:
```bash
npm run dev
```

٥. افتح:
```
http://localhost:3000/dashboard/login
```

٦. ادخل بـ:
- البريد: `admin@freezone-iq.com`
- كلمة المرور: `ChangeMe!2026`

٧. **بدّل كلمة المرور فوراً** من صفحة "حسابي" بعد تسجيل الدخول.

---

## لاحقاً — إذا أردت اعتماد كلمة سر مخصصة عند الـ seed:

```bash
DASHBOARD_SEED_EMAIL="you@freezone-iq.com" \
DASHBOARD_SEED_NAME="اسمك" \
DASHBOARD_SEED_PASSWORD="كلمة-سر-قوية-جداً" \
  npm run db:seed:dashboard
```

---

اقرأ `DASHBOARD.md` للمزيد من التفاصيل التقنية، مصفوفة الصلاحيات، خارطة المرحلة الثانية، وكيف تحذف اللوحة القديمة لاحقاً بأمان.
