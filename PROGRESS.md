# Freezone Data Entry System — Progress Log

## Status: DONE (نهائي)
## Branch: `feat/data-entry-system`
## Last Update: 2026-05-25
## Batches 1–6: مكتملة | Batch 7 (Staging): خارج النطاق

---

## ملخص التسليم

نظام إدخال المنتجات وإدارة الفئات جاهز للاختبار اليدوي: محرر منتج كامل، قائمة منتجات متقدمة، سير مراجعة، قوالب سمات، استيراد CSV، ولوحة مؤشرات للمشغّلين/المديرين.

---

## مسارات الواجهة الجديدة (Admin — freezone-web)

| URL | الوصف |
|-----|--------|
| `/admin/review-queue` | قائمة منتجات `PENDING_REVIEW` — نشر / طلب تعديلات |
| `/admin/import` | استيراد منتجات من CSV (معاينة + استيراد فعلي) |
| `/admin/products/edit/:id?review=1` | فتح المحرر في وضع مراجعة (تعليقات جانبية) |

**مسارات موجودة مسبقاً ومُعزَّزة:**

| URL | التحسينات |
|-----|-----------|
| `/admin/products` | فلاتر متقدمة، تحرير سريع، bulk، تصدير CSV، حذف بتأكيد الاسم |
| `/admin/products/edit/:id` | تعليقات، نسخ قالب، حفظ+منتج جديد، `Ctrl+D` |
| `/admin/categories` | تطبيق قالب سمات من القائمة ⋮ |
| `/admin` (لوحة التحكم) | KPIs مشغّل/مدير (`operator-stats`) |
| `/dashboard/login` | دخول المشغّلين (مطلوب لكل CUD) |

**متجر (معاينة منتج):** `/ar/product/:id`

---

## API endpoints جديدة (freezone-api)

| Method | Path | الوصف |
|--------|------|--------|
| `GET` | `/api/admin/review-queue` | قائمة مراجعة (paginated) |
| `PATCH` | `/api/admin/review-queue` | `{ productId, action: publish \| changes_requested, reviewNotes? }` |
| `GET` | `/api/admin/notifications` | شارات: pendingReview, newComments, categoriesNoAttrs |
| `GET` | `/api/admin/operator-stats` | إحصائيات المشغّل/المدير للوحة التحكم |
| `GET` | `/api/admin/category-templates` | قائمة قوالب السمات |
| `POST` | `/api/admin/categories/:id/apply-template` | `{ templateId }` — upsert سمات القسم |
| `GET` | `/api/admin/products/export` | CSV حسب نفس query params القائمة (+ `limit`) |
| `POST` | `/api/admin/products/:id/duplicate` | نسخ منتج كمسودة جديدة |
| `GET` | `/api/admin/products/:id/comments` | تعليقات المراجعة |
| `POST` | `/api/admin/products/:id/comments` | `{ text }` |
| `POST` | `/api/admin/import/products-csv` | `{ csv, dryRun? }` — مصدر `ImportBatch`: `csv-products` |

**مُحدَّث (سلوك):**

| Method | Path | التغيير |
|--------|------|---------|
| `DELETE` | `/api/admin/products/:id` | حذف ناعم + `ARCHIVED` |
| `POST` | `/api/admin/products/bulk` | publish/unpublish يزامن `catalogStatus` |
| `GET` | `/api/admin/products` | فلاتر: `catalogStatus`, `brandId`, `priceMin/Max`, `quantityMin/Max`, `createdById`, `sort=updated_desc` |

**قائمة المنتجات — query params مدعومة:**

`page`, `pageSize`, `search`, `categoryId`, `published`, `stock`, `catalogStatus`, `brandId`, `priceMin`, `priceMax`, `quantityMin`, `quantityMax`, `createdById`, `deleted`, `sort`

---

## متغيرات البيئة

### جديدة في هذه الدفعة
**لا يوجد** — Batches 3–6 لا تضيف env vars جديدة.

### مطلوبة لتشغيل النظام (موجودة مسبقاً)

**freezone-api** (`.env` / `.env.local`):

| المتغير | الغرض |
|---------|--------|
| `DATABASE_URL` | PostgreSQL |
| `ADMIN_SESSION_SECRET` | توقيع cookies (≥32 حرفاً في الإنتاج) |
| `ADMIN_PASSWORD` | دخول legacy admin (إن `ADMIN_REQUIRE_PASSWORD=true`) |
| `ADMIN_REQUIRE_PASSWORD` | `true` في الإنتاج |
| `JWT_SECRET` | JWT المتجر (إن وُجد) |
| `CORS_ORIGIN` / origins | أصول الواجهة المسموحة |

**freezone-web** (`.env`):

| المتغير | الغرض |
|---------|--------|
| `VITE_API_URL` | عنوان API (مثال `http://localhost:4000`) |

راجع: `docs/runbooks/secrets.md`, `freezone-api/.env.example`, `freezone-web/.env.example`

---

## تشغيل محلي للتجربة اليدوية

### 1. قاعدة البيانات والهجرات

```bash
cd freezone-api
# تأكد من DATABASE_URL في .env.local
npx prisma migrate deploy
# أو للتطوير:
npx prisma migrate dev
npx prisma validate
```

هجرات مطلوبة على الأقل:

- `20260525120000_admin_roles_and_audit_actor`
- `20260525140000_catalog_editor_fields`
- `20260524040000_product_soft_delete` (إن لم تُطبَّق)

### 2. بذور المشغّلين

```bash
cd freezone-api
npx tsx prisma/seed-dashboard-superadmin.ts
npx tsx scripts/seed-operators.ts
# كلمات المرور في OPERATORS_CREDENTIALS.md (gitignored)
```

### 3. تشغيل API

```bash
cd freezone-api
npm install
npm run dev
# افتراضي: http://localhost:4000
```

### 4. تشغيل الواجهة الإدارية

```bash
cd freezone-web
npm install
# VITE_API_URL=http://localhost:4000 في .env.local
npm run dev
# افتح المتصفح على منفذ Vite (غالباً http://localhost:5173)
```

### 5. تسجيل الدخول والاختبار

1. `/dashboard/login` أو `/admin/login` — استخدم حساب مشغّل من البذور.
2. **مشغّل:** `/admin/products/new` → محرر → «إرسال للمراجعة».
3. **مدير:** `/admin/review-queue` → نشر أو طلب تعديلات.
4. **قائمة منتجات:** فلاتر، تحرير سريع، bulk، تصدير CSV.
5. **استيراد:** `/admin/import` → معاينة ثم استيراد.
6. **أقسام:** `/admin/categories` → ⋮ → تطبيق قالب (`smartphone`, `laptop`, `tv`, `accessory`).

### 6. تحقق بناء (اختياري)

```bash
cd freezone-api && npx tsc --noEmit && npm run build
cd freezone-web && npx tsc --noEmit && npm run build
```

---

## وثائق

| ملف | المحتوى |
|-----|---------|
| `docs/operator-handbook.md` | دليل المشغّلين (عربي) |
| `docs/category-templates.md` | قوالب السمات و API |
| `docs/runbooks/secrets.md` | أسرار Fly والإنتاج |

---

## Batches

- [✓] Batch 1: Foundation & Security
- [✓] Batch 2: Full Product Editor
- [✓] Batch 3: Anti-Errors & Speed
- [✓] Batch 4: Review Workflow
- [✓] Batch 5: Categories & Attributes Manager
- [✓] Batch 6: Bulk Import & Productivity
- [—] Batch 7: Staging — لم يُنفَّذ (خارج نطاق المستخدم)

---

## اختبارات آخر تشغيل

- `npx prisma validate` ✓
- `npx tsc --noEmit` api ✓ web ✓
- `npm run build` api ✓ web ✓
