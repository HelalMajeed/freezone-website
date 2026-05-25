# المرحلة 0 — حالة التنفيذ

| البند | الحالة |
|--------|--------|
| ADR-001 Commerce Suite | ✅ |
| ADR-002 Next.js | ✅ |
| إزالة `commerce-suite/` من main | ✅ |
| CI بدون commerce jobs | ✅ |
| توثيق DB إنتاج | ✅ `PRODUCTION_DATABASE.md` |
| Disaster Recovery | ✅ `DISASTER_RECOVERY.md` |
| Secrets checklist | ✅ `SECRETS_CHECKLIST.md` |
| Backup workflow | ✅ `backup-database.yml` (يتطلب `DATABASE_URL_PROD`) |
| Sentry scaffold (API) | ✅ عند ضبط `SENTRY_DSN` |
| تنظيف Global Iraq إنتاج | ✅ 88 منتج |
| Linear/GitHub Projects | ⚪ يدوي |
| Sentry حساب + DSN إنتاج | ⚪ يحتاج حسابك |
| Issue #4 أسرار GitHub | ⚪ |

**التالي:** المرحلة 1 — Auth.js، Playwright، staging.
