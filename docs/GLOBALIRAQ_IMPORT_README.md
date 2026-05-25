# استيراد منتجات Global Iraq إلى FreeZone

## مكان ملفات البيانات

المجلد الافتراضي على Windows:

```
C:\Users\Helal\Downloads\GlobalIraq_COMPLETE_Recovery_Export
```

الملفات المستخدمة:

| ملف | الاستخدام |
|-----|-----------|
| `data/products_import_ready.jsonl` | **المصدر الرئيسي** — سطر JSON لكل منتج |
| `data/images.csv` | ترتيب الصور + الملف المحلي |
| `data/specs.csv` | مواصفات مفصولة (مفتاح/قيمة) |
| `data/variants.csv` | متغيرات المنتج (OS، إلخ) |
| `images_all/` | صور محلية منزّلة |

## متطلبات قاعدة البيانات

1. ضع `DATABASE_URL` في **كلا** الملفين (يجب أن يتطابقا):
   - `freezone-api/.env`
   - `freezone-web/.env`

مثال محلي (Docker):

```
DATABASE_URL="postgresql://freezone:freezone_dev@localhost:5432/freezone"
```

مثال pg-local-cluster (بدون Docker):

```
DATABASE_URL="postgresql://freezone:freezone_dev@localhost:5433/freezone"
```

2. شغّل PostgreSQL ثم migrations (بدون `db seed` كامل إن كان يحذف المنتجات):

```powershell
cd freezone-web
npm run db:local
# أو
npm run pg:cluster:start
```

3. تأكد من الاتصال:

```powershell
cd freezone-api
npx tsx scripts/test-db-connection.ts
```

## أوامر الاستيراد

من مجلد `freezone-api`:

### تجربة 5 منتجات فقط (مطلوب قبل الكامل)

```powershell
npm run import:globaliraq:test
```

أو:

```powershell
npx tsx scripts/import-globaliraq-products.ts --limit 5 --export-dir "C:\Users\Helal\Downloads\GlobalIraq_COMPLETE_Recovery_Export"
```

### معاينة بدون كتابة DB

```powershell
npx tsx scripts/import-globaliraq-products.ts --limit 5 --dry-run
```

### الاستيراد الكامل (1,230 منتج — لا تشغّله إلا بعد الموافقة)

```powershell
npm run import:globaliraq
```

### تحديث منتجات موجودة مسبقًا

```powershell
npx tsx scripts/import-globaliraq-products.ts --update --export-dir "C:\Users\Helal\Downloads\GlobalIraq_COMPLETE_Recovery_Export"
```

## منع التكرار (Idempotent)

- كل منتج يُخزَّن في `sourceHandle` (فريد) + مرجع legacy في `storage`: `globaliraq|{source_handle}|{source_url}`
- إذا وُجد المنتج: **يُتخطّى** افتراضيًا
- مع `--update`: يُحدَّث السعر والوصف والصور والمتغيرات

## السعر والضمان

- **السعر النهائي:** من حقل `price` في JSONL (بعد +35% ومقرب)
- إن لم يوجد: `round(original_price × 1.35)`
- **السعر الأصلي:** `originalPrice` في DB (للمراجعة في الأدمن)
- **الضمان:** `ضمان سنتين وكالة` — في حقل `warranty` + الوصف + `specs.warranty`

### تغيير نسبة الزيادة لاحقًا

عدّل `PRICE_MARKUP` في `freezone-api/scripts/import-globaliraq-products.ts` (حاليًا `1.35`) وأعد التشغيل مع `--update`.

### تغيير الضمان لاحقًا

عدّل `WARRANTY_AR` في نفس السكربت، أو حدّث حقل `warranty` في `/admin/products/edit/:id`.

## لوحة الإدارة

- `/admin/import/globaliraq` — أوامر الاستيراد + آخر تقرير
- `/admin/products/edit/:id` — الضمان، السعر الأصلي، source_handle، المتغيرات، معرض الصور

## Migration (حقول جديدة)

```powershell
cd freezone-api
npx prisma migrate deploy
```

يضيف: `warranty`, `originalPrice`, `sourceHandle`, `sourceUrl`, `importedAt` — بدون حذف بيانات.

## الصور

- تُنسخ من `images_all/` إلى `freezone-api/public/uploads/products/YYYY/MM/`
- أول صورة = رئيسية (`sortOrder` 0)
- الباقي = معرض المنتج

## التقرير

بعد كل تشغيل:

```
freezone-api/logs/globaliraq-import-report.json
```

يحتوي: imported, updated, skipped, failed, imagesCopied, errors, …

## التراجع

- السكربت **لا يحذف** منتجات موجودة
- لإزالة منتجات مستوردة: ابحث في DB عن `storage` يبدأ بـ `globaliraq|`
- أو احذف يدويًا من `/admin/products` حسب المعرفات في التقرير `samples`

## بنية المشروع

| جزء | تقنية |
|-----|--------|
| واجهة المتجر + الأدمن | React + Vite (`freezone-web`) |
| API | Express + Prisma (`freezone-api`) |
| قاعدة البيانات | PostgreSQL |
| المنتجات | `Product`, `ProductImage`, `ProductVariant` |

صفحة المنتج: `/ar/product/:id` — تعرض الوصف HTML والمواصفات من `specs` و EAV.
