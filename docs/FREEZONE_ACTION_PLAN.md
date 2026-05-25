# خطة عمل Freezone — من المنصة الحالية إلى مستوى عالمي

وثيقة تنفيذية شاملة | بدون جداول زمنية

> **المستودع:** [github.com/HelalMajeed/freezone-website](https://github.com/HelalMajeed/freezone-website)  
> **الحالة:** مسودة استراتيجية — تُحدَّث بعد الإجابة على الأسئلة الاستراتيجية الثلاثة.

---

## الافتراضات الأساسية (حتى تأكيد القرارات)

| الافتراض | القيمة المفترضة | يحتاج تأكيد؟ |
|----------|-----------------|--------------|
| الطموح | متجر عراقي قوي مع إعداد للتوسع الإقليمي | نعم |
| المسار التقني | تطوّر تدريجي + هجرة الواجهة لـ Next.js + حذف Commerce Suite | نعم |
| حجم الفريق | مهندس قائد + مهندسون + مصمم UX (يمكن البدء بأقل) | نعم |
| اللغات | عربي (أساسي) + إنجليزي + كردي (لاحقاً) | نعم |
| العملات | IQD أساسي + USD ثانوي | نعم |

---

## نظرة عامة على المراحل السبع

| المرحلة | الهدف الرئيسي |
|---------|----------------|
| **0** | التنظيف والقرارات |
| **1** | تثبيت الأساس (أمن + مراقبة + اختبارات) |
| **2** | هجرة الواجهة (Next.js + SSR + SEO) |
| **3** | ميزات التجارة الأساسية (دفع + بحث + Cache + Jobs) |
| **4** | السوق المحلي + UX |
| **5** | الأداء والتوسع |
| **6** | الإطلاق |

التفاصيل الكاملة لكل مرحلة — انظر الأقسام أدناه. للمتابعة اليومية استخدم [`PHASE0_STATUS.md`](./PHASE0_STATUS.md).

---

## المرحلة 0 — التنظيف والقرارات الحاسمة

### القرار 1 — مصير Commerce Suite

**الموصى به:** حذف من `main` أو نقل إلى فرع `archive/commerce-suite`، نقل أي كود مفيد إلى Freezone، إزالة ports 3010/3020 من docker-compose و workflows CI الخاصة به.

**الأسوأ (الحالي):** مساران متوازيان بلا قرار.

### القرار 2 — مصير الواجهة

Vite SPA قتل SEO عملياً → **هجرة كاملة لـ Next.js 15 App Router** (المرحلة 2). اكتب ADR يوثّق القرار.

### إصلاح Issues العالقة

- **#4** — أسرار GitHub Actions (FLY_API_TOKEN, DATABASE_URL_PROD, SENTRY_DSN, …)
- **#5** — Sentry حقيقي (`@sentry/node`, `@sentry/react`)
- **#17** — `FREEZONE_ADMIN_PASSWORD` في Vault + Fly secrets
- **#22** — تحقيق 96 منتج مُرجَع
- **#26** — **لا استيراد 1226** قبل اكتمال المرحلة 1

### توثيق الوضع الحالي

- خريطة قاعدة الإنتاج الفعلية (Fly Postgres vs Neon vs محلي)
- نسخ احتياطية دورية (pg_dump → S3/R2)
- وثيقة Disaster Recovery

### مخرجات المرحلة 0

- ADR موقّع (Commerce Suite + Next.js)
- Sentry يعمل
- أسرار CI/Fly كاملة
- Backup مُختبر (pg_restore)
- لوحة مهام (Linear / GitHub Projects)

---

## المرحلة 1 — تثبيت الأساس

أمن (Auth.js/Clerk، RBAC، 2FA، OTP SMS، argon2id، rate limit Redis)، مراقبة (Sentry، PostHog، Better Stack)، اختبارات (Playwright، Vitest، k6)، CI/CD (staging، preview PR).

---

## المرحلة 2 — هجرة Next.js

Strangler Fig: `freezone-storefront/`، proxy تدريجي، SSR/ISR، SEO، admin تحت `/admin` في Next.js، shadcn/ui.

---

## المرحلة 3 — تجارة أساسية

ZainCash، FastPay، COD+OTP، Meilisearch، Redis، BullMQ، CDN صور (R2/Bunny).

---

## المرحلة 4 — سوق محلي + UX

عنونة Mapbox، WhatsApp Business، شحن محلي، ترجمات، Loyalty، PWA، RTL متقن.

---

## المرحلة 5 — أداء وتوسع

k6، Core Web Vitals، PostHog funnels، security audit خارجي.

---

## المرحلة 6 — إطلاق

Soft launch → إطلاق رسمي → iterations.

---

## الـ Stack النهائي الموصى به

- **Storefront/Admin:** Next.js 15 + TS + Tailwind + shadcn
- **API:** Express + Prisma + PostgreSQL 16 + Auth.js + Zod
- **Search:** Meilisearch · **Cache/Queue:** Redis + BullMQ
- **Storage/CDN:** Cloudflare R2 + Cloudflare
- **Deploy:** Fly.io + GitHub Actions
- **Monitoring:** Sentry + PostHog + Better Stack

---

## ما يجب فعله أولاً (ترتيب الأولوية)

1. قرار Commerce Suite (احذف أو أرشف)
2. تحقق من `DATABASE_URL` الإنتاج على Fly
3. نسخة احتياطية فورية للإنتاج
4. تفعيل Sentry
5. أسرار GitHub + Fly
6. قناة `#incidents`
7. ADR رسمية
8. لوحة مهام بالمراحل
9. ميزانية + حجم فريق
10. **الإجابة على الأسئلة الاستراتيجية الثلاث**

> *"Make it work, make it right, make it fast" — Kent Beck*

---

*للنسخة التفصيلية الكاملة (فريق، تكاليف، KPIs، سجل مخاطر) راجع محادثة التخطيط الأصلية أو وسّع هذا الملف لاحقاً.*
