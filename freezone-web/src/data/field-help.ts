export type FieldHelp = { ar: string; good: string; bad: string; why: string };

export const FIELD_HELP: Record<string, FieldHelp> = {
  nameAr: {
    ar: "الاسم بالعربية كما يظهر للزبون",
    good: "سامسونج جالاكسي S24 — 256GB",
    bad: "منتج 1",
    why: "يحسّن البحث والثقة",
  },
  nameEn: {
    ar: "الاسم بالإنجليزية للفهرسة",
    good: "Samsung Galaxy S24 256GB",
    bad: "item",
    why: "مطلوب للتصدير والتكامل",
  },
  sku: {
    ar: "رمز فريد للمخزن",
    good: "SAM-S24-256-BLK",
    bad: "—",
    why: "يتجنب الخلط في المستودع",
  },
  price: {
    ar: "سعر البيع بالدينار",
    good: "450000",
    bad: "0",
    why: "لا يُنشر منتج بسعر صفر",
  },
  slug: {
    ar: "رابط المنتج (لاتيني، بدون مسافات)",
    good: "samsung-galaxy-s24-256",
    bad: "منتج جديد",
    why: "SEO وروابط ثابتة",
  },
};
