# تدقيق لوحة الإدارة وتقدم التنفيذ

آخر تحديث: 2026-04-05

## 1) ملخص التدقيق (Phase 1)

### الموجود فعلياً

- **Next.js App Router** مع مجلدات `src/app/[locale]/*` (واجهة المتجر) و `src/app/admin/*`.
- **Prisma + PostgreSQL** لـ: `Category`, `Product`, `ProductImage`, `SiteConfig`, شرائح الهيرو، الشريط المتحرك، الثقة، بقع الأقسام، روابط اجتماعية، `PromoBanner`, `ShowroomMedia`، بالإضافة إلى **`Brand`**, **`MediaAsset`**, **`CmsPage` / `CmsPageSection`**, **`ProductVariant`** (هيكل فقط)، **`Order`** (مع `couponCode`, `discountTotal`).
- **لوحة إعدادات الموقع** (`/admin/cms`) متصلة بـ `GET/PUT /api/admin/cms` مع معاينة مباشرة جزئية.
- **بناء الصفحة الرئيسية** (`/admin/content`): أقسام ديناميكية، مسودة/نشر، ترتيب، نسخ، إظهار/إخفاء، تحرير حمولة المسودة كـ JSON.
- **مكتبة الوسائط** (`/admin/media`): قائمة وبحث، رفع، بيانات وصفية، حذف السجل.
- **المظهر** (`/admin/design`): حفظ `themeTokens` عبر `GET/PATCH /api/admin/theme`؛ المتجر يطبّقها عبر `ThemeApplier` ومتغيرات CSS (`--fz-*`).
- **الكوبونات**: تحقق `POST /api/public/coupon/validate`؛ السلة والدفع يحسبان الخصم؛ الطلب العمومي يعيد التحقق ويزيد `usedCount` عند النجاح.
- **العلامات التجارية** (`/admin/brands`): CRUD أساسي + `DELETE` يفك ربط المنتجات.
- **منتجات**: ربط اختياري `brandId`، وإدراج صور من **منتقي المكتبة** (`MediaPickerModal`).

### الفجوات التاريخية (قبل التراكم الحالي)

1. الرئيسية كانت تعتمد على `PRODUCTS` الثابت في بعض الأقسام — تم سابقاً ربط الكتالوج بالـ DB مع fallback.
2. الطلبات كانت محلية فقط — تم تسجيلها في PostgreSQL مع المخزون.
3. الكوبونات كانت إدارية فقط — مُربَطة الآن بالدفع.

---

## 2) ما تم تنفيذه في الكود (آخر جولة — طبقة المتجر المرئي و CMS)

| المحور | الحالة | التفاصيل |
|--------|--------|-----------|
| **CMS — معرض + بانرات** | مربوط بالكامل | `ShowroomMedia` و`PromoBanner`: تبويبا «معرض الصور» و«بانرات العروض» في `/admin/cms` مع `GET/PUT` يحفظان الجداول؛ المعاينة والمتجر يقرآن العناوين والصور |
| **التصنيفات — facetKeys** | جاهز | حقل JSON مصفوفة في `/admin/categories` لربط مفاتيح الفلاتر بالكتالوج |
| **مكتبة الوسائط** | جاهز للاستخدام | `/admin/media`, `MediaAsset`, رفع مع `registerLibrary`, `GET/POST /api/admin/media`, `PATCH/DELETE .../media/[id]` |
| **منتقي الوسائط** | جاهز للاستخدام في المنتجات | `MediaPickerModal` (وضع متعدد/مفرد) — يمكن إعادة استخدامه في محرر الأقسام لاحقاً |
| **بناء الصفحة الرئيسية** | يعمل — محرر JSON | `/admin/content`, APIs تحت `/api/admin/cms-page/*`؛ النشر ينسخ **كل** مسودات الأقسام إلى `publishedPayload` |
| **واجهة المتجر للأقسام** | يعمل مع fallback | `getPublishedHomeSections()`؛ إن لم يكن هناك أقسام منشورة — العرض الافتراضي (legacy) |
| **السمات المرئية** | يعمل | حقول إضافية: `secondaryForeground`, `backgroundImage`, `buttonStyle`؛ preset لتباعد الأقسام في واجهة الإدارة |
| **الكوبونات في الدفع** | مربوط | `Order.couponCode`, `discountTotal`؛ واجهة الطلبات تعرض الخصم في التفاصيل |
| **العلامات** | جدول + إدارة | `Brand`, `brandId` على المنتج؛ صفحة `/admin/brands` |
| **المتغيرات** | هيكل فقط | `ProductVariant` في المخطط — لا واجهة دفع بعد |

---

## 3) ما يزال مطلوباً / غير مكتمل

1. **محرر أقسام غني**: استبدال أو تقوية JSON في `content` بنماذج حقول لكل نوع قسم + ربط **منتقي المكتبة** مباشرة بالحقول.
2. **فيديو في المكتبة**: إضافة واجهة «رابط فيديو» أو رفع يدوي عبر النموذج (حالياً النوع `video` يُحدَّث يدوياً بعد إنشاء السجل إن لزم).
3. **ربط صور الأقسام بـ FK**: حالياً الحمولة JSON تحمل `imageUrl` نصي — مقبول عملياً؛ ترحيل اختياري إلى علاقات.
4. **Footer ثابت من next-intl**: نصوص التذييل قد تبقى من الترجمة؛ `tagline` من الموقع يُستخدم في أماكن أخرى — دمج اختياري لاحقاً.
4. **تطبيق `buttonStyle` على مكوّنات الأزرار في المتجر**: الرمز مُعرّف على الجذر (`fz-btn-*`) ويتطلب ربط CSS/مكوّنات تدريجي.
5. **`prisma generate`**: عند فشل `EPERM` على Windows، أوقف `npm run dev` ثم نفّذ `npx prisma generate`.
6. **AdminUser / AuditLog** — توسيع الحماية وسجل التدقيق كما في خارطة الطريق السابقة.

---

## 4) أوامر قاعدة البيانات

**إعداد سريع محلي (بعد تثبيت Docker Desktop):**

```bash
npm run env:init
npm run db:local
```

على **Windows** مع Docker: `npm run db:local:win`.  
**بدون Docker:** `npm run db:local` يشغّل `db-provision.cjs` الذي يتخطّى `docker compose` إن لم يوجد `docker` في PATH، ثم ينفّذ `migrate deploy` و`db seed` فقط — يجب أن يكون Postgres شغّالاً على `DATABASE_URL` (تثبيت محلي، أو Neon/Supabase، أو تثبيت Docker لاحقاً).

ثم أعد تشغيل `npm run dev`. يُنشئ `env:init` ملف `.env` من `.env.example` إذا لم يكن موجوداً؛ و`db:local` يرفع Postgres ويطبّق المهاجرات والبذرة.

**يدوياً:**

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

---

## 5) ملخص قصير

النظام في حالة **قابلة للبناء** بعد توليد عميل Prisma ومزامنة المهاجرات: إدارة عربية RTL مع **CMS عالمي** (`/admin/cms`)، **منشئ أقسام للرئيسية** (`/admin/content`)، **وسائط مركزية**، **سمات من `themeTokens`**، **كوبونات حية**، و**علامات تجارية** مرتبطة بالمنتجات، مع fallback آمن عند غياب أقسام منشورة.
