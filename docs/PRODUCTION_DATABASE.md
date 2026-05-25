# قاعدة بيانات الإنتاج — Freezone

**آخر تحقق:** 2026-05-23

## المصدر الفعلي للحقيقة

| البند | القيمة |
|--------|--------|
| المنصة | **Fly.io** |
| تطبيق API | `freezone-website` |
| Postgres | `freezone-website-pg` (Fly Postgres) |
| الاتصال الداخلي | `freezone-website-pg.flycast:5432` |
| قاعدة البيانات | `freezone_website` |
| المستخدم | `freezone_website` |
| السر | Fly secret `DATABASE_URL` على تطبيق `freezone-website` |

## الوصول من جهاز التطوير

```bash
flyctl proxy 15432:5432 -a freezone-website-pg
# DATABASE_URL=postgresql://freezone_website:***@127.0.0.1:15432/freezone_website?sslmode=disable
```

## حالة الكتالوج (بعد تنظيف Global Iraq)

| المقياس | العدد |
|---------|--------|
| منتجات منشورة | **88** |
| منتجات Global Iraq (`sourceHandle`) | **0** |
| طلبات | 5 |
| أقسام | 17 |

## تخزين الصور

| البيئة | المسار |
|--------|--------|
| Fly Volume | `uploads_data` → `/app/public/uploads` |
| URL عام | `https://freezone-website.fly.dev/uploads/...` |
| Netlify storefront | يوجّه API إلى Fly (`VITE_API_URL`) |

## ما ليس إنتاجاً

- `localhost:5432` — تطوير محلي فقط
- `commerce-suite` schema — **مُوقَف** (ADR-001)
- استيراد JSONL Global Iraq — **متوقف** حتى المرحلة 3 (BullMQ)

## تحقق سريع

```bash
cd freezone-api
npm run db:counts   # مع DATABASE_URL الإنتاج عبر proxy
```
