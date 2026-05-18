# Universal Product Classification Framework

إطار عمل معتمد لبناء أنظمة تصنيف وفلاتر منتجات في مشاريع التجارة الإلكترونية.

هذا الملف مصمم ليكون **قابل لإعادة الاستخدام** في أي مشروع مستقبلي.

---

## A) المبادئ الأساسية

1. **Taxonomy First**  
   ابدأ دائمًا ببناء شجرة تصنيفات واضحة قبل بناء الواجهات.

2. **Attribute-driven UI**  
   واجهة الفلاتر يجب أن تُولد من تعريف الخصائص، وليس من كود ثابت.

3. **Typed Attributes**  
   كل خاصية لها نوع محدد (`SELECT`, `RANGE`, `BOOLEAN`...) يمنع الفوضى.

4. **Separation of Concerns**  
   - التصنيف: أين ينتمي المنتج؟
   - المواصفات: ما خصائصه؟
   - الفلترة: كيف نختصر النتائج؟

5. **Scalable by Design**  
   إضافة فئة/علامة/خاصية جديدة لا تتطلب إعادة بناء النظام.

---

## B) نموذج البيانات القياسي (Conceptual)

اعتمد النموذج التالي في أي مشروع:

- `Category`
  - id, slug, name, parentId, isActive

- `CategoryAttribute`
  - categoryId
  - key (snake_case)
  - type (`SELECT | MULTI_SELECT | RANGE | BOOLEAN | TEXT | COLOR`)
  - options (لـ SELECT / MULTI_SELECT)
  - filterable / searchable / comparable
  - displayGroup / sortOrder

- `Product`
  - categoryId, brandId, base fields
  - specs (JSON view model)

- `ProductAttributeValue`
  - productId
  - attributeKey
  - valueString / valueNumber / valueBoolean / valueJson

---

## C) دورة إدخال أي منتج (Standard Flow)

1. تصنيف المنتج: `Category` + `Subcategory`
2. تحديد `Brand` + `Model`
3. تعبئة خصائص الفئة حسب `CategoryAttribute`
4. توليد `Variants` (إن وجد)
5. التحقق من جودة البيانات
6. فحص ظهور المنتج في الفلاتر

---

## D) قواعد تسمية Attributes

- استخدم `snake_case` فقط  
  مثال: `battery_capacity`, `screen_size`, `refresh_rate`

- المفتاح يمثل معنى واحد فقط  
  لا تستخدم: `ram` و `memory_size` لنفس الشيء

- استخدم وحدات موحدة:
  - `GB`, `TB`
  - `mAh`
  - `inch`
  - `Hz`
  - `W`
  - `MP`

---

## E) مصفوفة أنواع الفلاتر

- `SELECT` -> قائمة اختيار مفرد
- `MULTI_SELECT` -> قائمة اختيار متعدد
- `RANGE` -> Min/Max
- `BOOLEAN` -> true/false
- `COLOR` -> swatch + value
- `TEXT` -> عرض/بحث محدود

قاعدة تنفيذ:
- أي `filterable=true` يجب أن يظهر في واجهة الفلاتر
- أي `filterable=false` يبقى للعرض فقط

---

## F) استراتيجية URL Filters (Best Practice)

استخدم URL state دائمًا:

- `?brand=apple,samsung`
- `?price=300-1200`
- `?ram=8,12`
- `?network_5g=true`

الفوائد:
- مشاركة الروابط
- حفظ الحالة
- SEO أفضل لصفحات النتائج

---

## G) Quality Gate قبل الإنتاج

- [ ] Taxonomy مكتملة
- [ ] Attributes لكل فئة أساسية مكتملة
- [ ] Filter types صحيحة
- [ ] Data samples كافية لكل فئة
- [ ] فحص edge cases (0 results / invalid ranges)
- [ ] فحص الأداء مع عدد منتجات كبير

---

## H) Anti-patterns يجب تجنبها

- Hardcoded filters داخل الواجهة لكل فئة
- Attributes بلا نوع واضح
- أسماء خصائص متضاربة
- قيم نصية غير معيارية في الحقول الرقمية
- خلط المواصفات التسويقية مع الفلترة الأساسية

---

## I) Playbook للتوسع المستقبلي

عند إضافة فئة جديدة:

1. أنشئ `Category`
2. أنشئ `CategoryAttribute` المناسبة
3. أضف بيانات seed لمنتجات حقيقية
4. اختبر واجهة الفلاتر بدون تعديل يدوي
5. اضبط facet ranking بعد توفر بيانات كافية

---

## J) اعتماد الإطار

يمكن اعتماد هذا الملف كمرجعية ثابتة لـ:
- تصميم قواعد البيانات
- بناء Admin لإدخال المنتجات
- بناء صفحات التصنيفات
- تطوير البحث والفلترة
- تدريب الفريق على نفس منهجية التصنيف

