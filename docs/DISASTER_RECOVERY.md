# Disaster Recovery — Freezone

## أهداف الاستعادة (مبدئية)

| المقياس | هدف |
|---------|-----|
| RPO (فقدان بيانات) | ≤ 24 ساعة (backup يومي) |
| RTO (عودة الخدمة) | ≤ 4 ساعات (يدوي) |

## ماذا تنسخ

1. **PostgreSQL** — `pg_dump -Fc` من `freezone-website-pg`
2. **Fly Volume** — `/app/public/uploads` (صور المنتجات)
3. **أسرار** — Fly secrets + GitHub Actions secrets (قائمة في `SECRETS_CHECKLIST.md`)

## استعادة قاعدة البيانات

```bash
# 1) إيقاف الكتابة على API (scale to 0 أو maintenance)
flyctl apps restart freezone-website   # بعد ضبط maintenance

# 2) استعادة (على نسخة جديدة أو نفس DB — بحذر)
pg_restore -h 127.0.0.1 -p 15432 -U freezone_website -d freezone_website \
  --clean --if-exists logs/freezone-production-before-globaliraq-import.dump

# 3) prisma migrate deploy
cd freezone-api && npx prisma migrate deploy

# 4) إعادة تشغيل API
flyctl machine start -a freezone-website
```

## استعادة الصور

- من نسخة Volume أو من backup ملفات مرفوعة إلى R2/S3 عند تفعيل النسخ الدوري.

## جهات الاتصال

- **On-call:** Tech Lead (يُعرَّف في `#incidents`)
- **Fly status:** https://status.flyio.net/

## اختبار DR

- **ربع سنوي:** استعادة backup على staging والتحقق من `db:counts` وصفحة منتج واحدة.
