# ADR-001: إيقاف Commerce Suite من المسار الرئيسي

**الحالة:** مقبول  
**التاريخ:** 2026-05-23

## السياق

المستودع احتوى مسارين متوازيين:

- `freezone-api` + `freezone-web` — الإنتاج الفعلي (88 منتج على Fly)
- `commerce-suite/` — NestJS + Next.js تجريبي، قاعدة/schema منفصلة

هذا يسبب تشتيت CI، وثائق مزدوجة، وخطر اتصال بقاعدة خاطئة.

## القرار

1. **إزالة `commerce-suite/` من فرع `main`.**
2. الكود التاريخي يبقى في Git history؛ للاسترجاع: `git log -- commerce-suite/`.
3. **Freezone** هو المصدر الوحيد للحقيقة (system of record).
4. أي ميزات مفيدة من Commerce Suite تُنقل لاحقاً إلى `freezone-api` عند الحاجة (لا نسخ أعمى).

## البدائل المرفوضة

- الإبقاء على المسارين دون قرار (الوضع السابق).
- Cut-over فوري لـ Commerce Suite كإنتاج (غير مجهّز، لا بيانات متجر).

## العواقب

- CI أسرع (jobان بدل أربعة).
- README و ARCHITECTURE أبسط.
- هجرة الواجهة تتم عبر **Next.js storefront** جديد (`freezone-storefront/`) وليس Commerce admin-web.
