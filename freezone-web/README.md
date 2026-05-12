# freezone-web

واجهة المتجر ولوحة الإدارة: **Vite 7** + **React 19** + **React Router** + **TypeScript** (ليست مشروع Next.js).

## التشغيل المحلي

من جذر المستودع (يُفضّل تشغيل API مع قاعدة البيانات أولاً):

```bash
npm run dev
```

أو من هذا المجلد بعد تهيئة البيئة وقاعدة البيانات حسب `../package.json` و`.env.example`.

## البناء

```bash
npm run build
npm run preview
```

## الاختبارات

```bash
npm run test
```

## ملاحظات

- طلبات `/api/*` في التطوير تُوجَّه عادةً إلى `freezone-api` (راجع `vite.config.ts` ومتغيرات البيئة).
- سكربتات إضافية: قاعدة بيانات محلية، فحص المنافذ، انتظار الـ API — انظر `package.json` → `scripts`.
