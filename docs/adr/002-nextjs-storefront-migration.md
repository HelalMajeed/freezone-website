# ADR-002: هجرة الواجهة العامة إلى Next.js 15

**الحالة:** مقبول  
**التاريخ:** 2026-05-23

## السياق

`freezone-web` (Vite SPA) يعمل للمتجر والأدمن لكن:

- SEO ضعيف (لا SSR لصفحات المنتجات).
- مشاركة روابط اجتماعية محدودة.
- bundle كبير على أول تحميل.

## القرار

1. إنشاء **`freezone-storefront/`** — Next.js 15 App Router + TypeScript + Tailwind.
2. **Strangler Fig:** proxy يوجّه `/` و `/ar/*` و `/product/*` تدريجياً للتطبيق الجديد.
3. **`/admin/*`** يبقى على Vite مؤقتاً حتى المرحلة 2.2.
4. **`freezone-api`** يبقى Express + Prisma دون تغيير جذري في المرحلة 2.

## معايير القبول (المرحلة 2)

- Lighthouse SEO > 95 على صفحة منتج.
- sitemap.xml + Schema.org Product.
- ISR للصفحة الرئيسية والفئات.

## العواقب

- مشروعان front-end مؤقتاً (Vite admin + Next storefront).
- يتطلب Cloudflare/Netlify/Fly routing واضح.
