# قائمة الأسرار — GitHub Actions و Fly.io

## GitHub Actions (`Settings → Secrets and variables → Actions`)

| Secret | مطلوب | الاستخدام |
|--------|--------|-----------|
| `FLY_API_TOKEN` | ✅ | نشر `freezone-website` |
| `NETLIFY_AUTH_TOKEN` | ✅ | نشر `freezone-web` |
| `NETLIFY_SITE_ID` | ✅ | Netlify site |
| `DATABASE_URL_PROD` | ⚠️ | backup workflow (proxy أو internal URL) |
| `SENTRY_DSN` | ⚠️ | CI smoke / deploy hooks |
| `PGPASSWORD` / `PGUSER` | ⚠️ | backup مجدول (إن لم يُستخدم URL كامل) |

## Fly.io (`freezone-website`)

| Secret | مطلوب |
|--------|--------|
| `DATABASE_URL` | ✅ → `freezone-website-pg` |
| `ADMIN_PASSWORD` | ✅ إنتاج |
| `ADMIN_SESSION_SECRET` | ✅ |
| `ADMIN_REQUIRE_PASSWORD` | `true` |
| `SENTRY_DSN` | موصى به |
| `SENTRY_ENVIRONMENT` | `production` |

## Fly.io (`freezone-website-pg`)

- كلمة مرور Postgres مُدارة من Fly — لا تُلصق في Git.

## توليد أسرار الأدمن محلياً

```bash
cd freezone-api
npm run admin:auth-print
npm run admin:auth-fly   # يطبّق على Fly
```

## Issue #17

لا تخزّن `ADMIN_PASSWORD` في `.env` المرفوع. استخدم 1Password/Vault + Fly secrets فقط.
