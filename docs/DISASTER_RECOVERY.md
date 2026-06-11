# Disaster Recovery — Freezone

## أهداف الاستعادة (مبدئية)

| المقياس | هدف |
|---------|-----|
| RPO (فقدان بيانات) | ≤ 24 ساعة (backup يومي) |
| RTO (عودة الخدمة) | ≤ 4 ساعات (يدوي) |

## الواقع الحالي (2026-06-11) — مهم

> النسخ الاحتياطي عبر `backup-database.yml` **لا ينتج شيئاً** حالياً: سرّ
> `DATABASE_URL_PROD` غير مضبوط، فكان الـ workflow يخرج بنجاح كاذب بصفر
> مرفقات. أُصلح ليفشل بصوت عالٍ. حتى يُضبط السرّ، **مسار الاستعادة الوحيد هو
> لقطات وحدة تخزين Fly Postgres** (`freezone-website-pg` / `vol_4qlg1e9lllpxzwdr`،
> لقطات يومية تلقائية + retention 5 أيام). آخر لقطة يدوية قبل عملية تنظيف
> الاستيراد: `vs_Rj3qLDVLJpNAc13aQDaPB` (2026-06-11).

```bash
# سرد اللقطات
flyctl volumes snapshots list vol_4qlg1e9lllpxzwdr -a freezone-website-pg
# لقطة عند الطلب
flyctl volumes snapshots create vol_4qlg1e9lllpxzwdr -a freezone-website-pg
# الاستعادة: أنشئ وحدة جديدة من لقطة ثم اربطها بآلة pg جديدة
flyctl volumes create pg_data --snapshot-id <vs_id> -a freezone-website-pg -r iad
```

لإعادة تفعيل `pg_dump` الدوري: اضبط سرّ GitHub `DATABASE_URL_PROD`
(+ `BACKUP_GPG_PASSPHRASE`) — انظر `SECRETS_CHECKLIST.md`.

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
