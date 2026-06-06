/**
 * Static bilingual policy copy (shipping / returns / privacy / terms).
 * Kept in code (not messages) so the long-form content stays together and the
 * dashboard CMS can later replace it wholesale with a DB-backed version.
 */

export type PolicyKind = "shipping" | "returns" | "privacy" | "terms";

export type PolicySection = {
  titleEn: string;
  titleAr: string;
  bodyEn: string[];
  bodyAr: string[];
};

export type PolicyDoc = {
  kind: PolicyKind;
  /** Seo namespace keys: `${seoKey}Title` / `${seoKey}Desc`. */
  seoKey: PolicyKind;
  titleEn: string;
  titleAr: string;
  updated: string;
  sections: PolicySection[];
};

export const POLICY_DOCS: Record<PolicyKind, PolicyDoc> = {
  shipping: {
    kind: "shipping",
    seoKey: "shipping",
    titleEn: "Shipping & Delivery Policy",
    titleAr: "سياسة الشحن والتوصيل",
    updated: "2026-06-01",
    sections: [
      {
        titleEn: "Coverage",
        titleAr: "التغطية",
        bodyEn: [
          "We deliver to every governorate in Iraq through trusted courier partners. Orders inside Baghdad are usually handed to the courier the same business day.",
        ],
        bodyAr: [
          "نوصّل إلى جميع محافظات العراق عبر شركات توصيل موثوقة. الطلبات داخل بغداد تُسلَّم للمندوب عادة في نفس يوم العمل.",
        ],
      },
      {
        titleEn: "Delivery times",
        titleAr: "مدد التوصيل",
        bodyEn: [
          "Baghdad: 1–2 business days.",
          "Other governorates: 2–5 business days depending on the courier route.",
          "Large or special-order items may take longer — our team confirms the timing on WhatsApp before dispatch.",
        ],
        bodyAr: [
          "بغداد: 1–2 يوم عمل.",
          "بقية المحافظات: 2–5 أيام عمل حسب خط شركة التوصيل.",
          "القطع الكبيرة أو المطلوبة خصيصاً قد تستغرق وقتاً أطول — يؤكد فريقنا الموعد عبر واتساب قبل الإرسال.",
        ],
      },
      {
        titleEn: "Fees & free delivery",
        titleAr: "الرسوم والتوصيل المجاني",
        bodyEn: [
          "The standard delivery fee is shown at checkout before you confirm the order.",
          "Orders above the free-delivery threshold shown in the cart ship free of charge.",
          "Cash-on-delivery is available nationwide — you pay the courier when the order arrives.",
        ],
        bodyAr: [
          "رسوم التوصيل القياسية تظهر في صفحة إتمام الطلب قبل التأكيد.",
          "الطلبات التي تتجاوز حد التوصيل المجاني الظاهر في السلة تُشحن مجاناً.",
          "الدفع عند الاستلام متاح في جميع المحافظات — تدفع للمندوب عند وصول الطلب.",
        ],
      },
      {
        titleEn: "Tracking",
        titleAr: "تتبع الطلب",
        bodyEn: [
          "Every order gets an order number (FZ-…). Use the Track Order page with your order number and phone to see live status updates.",
        ],
        bodyAr: [
          "كل طلب يحصل على رقم (FZ-…). استخدم صفحة تتبع الطلب مع رقم الطلب ورقم هاتفك لمشاهدة حالة الطلب أولاً بأول.",
        ],
      },
    ],
  },
  returns: {
    kind: "returns",
    seoKey: "returns",
    titleEn: "Returns & Warranty Policy",
    titleAr: "سياسة الإرجاع والضمان",
    updated: "2026-06-01",
    sections: [
      {
        titleEn: "Warranty",
        titleAr: "الضمان",
        bodyEn: [
          "Most products carry a 2-year store warranty unless a different period is stated on the product page.",
          "The warranty covers manufacturing defects. Physical damage, liquid damage and unauthorized repairs are not covered.",
        ],
        bodyAr: [
          "أغلب المنتجات مشمولة بضمان المتجر لمدة سنتين ما لم تُذكر مدة مختلفة في صفحة المنتج.",
          "يغطي الضمان عيوب التصنيع. لا يشمل الأضرار الفيزيائية أو أضرار السوائل أو الصيانة خارج مراكزنا.",
        ],
      },
      {
        titleEn: "Returns & exchanges",
        titleAr: "الإرجاع والاستبدال",
        bodyEn: [
          "Check your order in front of the courier — if an item arrives damaged or wrong, refuse it or contact us within 48 hours.",
          "Unopened products in original packaging can be exchanged within 7 days of delivery.",
          "Software licenses, consumables and special-order items cannot be returned once activated or opened.",
        ],
        bodyAr: [
          "افحص طلبك أمام المندوب — إذا وصل المنتج تالفاً أو مختلفاً، ارفض الاستلام أو تواصل معنا خلال 48 ساعة.",
          "المنتجات غير المفتوحة بغلافها الأصلي يمكن استبدالها خلال 7 أيام من الاستلام.",
          "الرخص البرمجية والمواد الاستهلاكية والقطع المطلوبة خصيصاً لا تُرجع بعد التفعيل أو الفتح.",
        ],
      },
      {
        titleEn: "How to start a claim",
        titleAr: "كيفية تقديم طلب ضمان",
        bodyEn: [
          "Contact us on WhatsApp or via the contact page with your order number and photos/videos of the issue. Our team will arrange inspection, repair or replacement.",
        ],
        bodyAr: [
          "تواصل معنا عبر واتساب أو صفحة الاتصال مع رقم الطلب وصور/فيديو للمشكلة. سيرتب فريقنا الفحص أو الإصلاح أو الاستبدال.",
        ],
      },
    ],
  },
  privacy: {
    kind: "privacy",
    seoKey: "privacy",
    titleEn: "Privacy Policy",
    titleAr: "سياسة الخصوصية",
    updated: "2026-06-01",
    sections: [
      {
        titleEn: "What we collect",
        titleAr: "ما الذي نجمعه",
        bodyEn: [
          "When you place an order we collect your name, phone number, city and delivery address — only what is needed to fulfil and deliver the order.",
          "Your cart, wishlist and compare lists are stored on your own device (browser storage), not on our servers.",
        ],
        bodyAr: [
          "عند إنشاء طلب نجمع اسمك ورقم هاتفك ومدينتك وعنوان التوصيل — فقط ما يلزم لتنفيذ الطلب وتوصيله.",
          "سلتك وقوائم المفضلة والمقارنة تُحفظ على جهازك (تخزين المتصفح) وليس على خوادمنا.",
        ],
      },
      {
        titleEn: "How we use it",
        titleAr: "كيف نستخدمها",
        bodyEn: [
          "Order details are used to process, deliver and support your purchase, including contacting you on WhatsApp about the order.",
          "We never sell your personal data. We share delivery details only with the courier handling your order.",
        ],
        bodyAr: [
          "تُستخدم بيانات الطلب لتجهيزه وتوصيله ودعمه، بما في ذلك التواصل معك عبر واتساب بخصوص الطلب.",
          "لا نبيع بياناتك الشخصية أبداً. نشارك تفاصيل التوصيل فقط مع شركة التوصيل المكلفة بطلبك.",
        ],
      },
      {
        titleEn: "Your choices",
        titleAr: "خياراتك",
        bodyEn: [
          "You can ask us to delete your order history and contact details at any time via the contact page.",
        ],
        bodyAr: ["يمكنك طلب حذف سجل طلباتك وبيانات الاتصال في أي وقت عبر صفحة الاتصال."],
      },
    ],
  },
  terms: {
    kind: "terms",
    seoKey: "terms",
    titleEn: "Terms of Service",
    titleAr: "شروط الاستخدام",
    updated: "2026-06-01",
    sections: [
      {
        titleEn: "Orders & pricing",
        titleAr: "الطلبات والأسعار",
        bodyEn: [
          "All prices are in Iraqi dinar (IQD) and include applicable taxes. Prices and availability can change without notice until an order is confirmed.",
          "An order is confirmed once our team validates it (usually on WhatsApp). We may cancel orders affected by obvious pricing errors or stock issues — you will be informed immediately.",
        ],
        bodyAr: [
          "جميع الأسعار بالدينار العراقي وتشمل الضرائب المطبقة. قد تتغير الأسعار والتوفر دون إشعار حتى تأكيد الطلب.",
          "يُعتمد الطلب بعد تأكيده من فريقنا (عادة عبر واتساب). قد نلغي الطلبات المتأثرة بأخطاء سعرية واضحة أو نفاد المخزون — مع إبلاغك فوراً.",
        ],
      },
      {
        titleEn: "Payments",
        titleAr: "الدفع",
        bodyEn: [
          "We support cash on delivery, cash at store pickup, and electronic methods (ZainCash, Qi Card, Visa, Mastercard) coordinated with our team. Cards are never charged automatically on this website.",
        ],
        bodyAr: [
          "ندعم الدفع عند الاستلام، والدفع نقداً عند الاستلام من المعرض، والطرق الإلكترونية (زين كاش، كي كارد، فيزا، ماستر كارد) بالتنسيق مع فريقنا. لا يُخصم من البطاقات تلقائياً عبر هذا الموقع.",
        ],
      },
      {
        titleEn: "Use of the site",
        titleAr: "استخدام الموقع",
        bodyEn: [
          "Product photos and descriptions are provided in good faith; minor variations from the retail package can occur.",
          "All content on this site belongs to FreeZone and may not be reused commercially without permission.",
        ],
        bodyAr: [
          "صور المنتجات وأوصافها معروضة بحسن نية؛ قد تحدث اختلافات بسيطة عن محتوى العبوة.",
          "جميع محتويات الموقع ملك لفري زون ولا يجوز إعادة استخدامها تجارياً دون إذن.",
        ],
      },
    ],
  },
};
