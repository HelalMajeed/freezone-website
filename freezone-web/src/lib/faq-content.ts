/**
 * Static bilingual FAQ copy for the /:locale/faq page.
 * Kept in code (not messages) following the `policy-content.ts` convention so the
 * long-form content stays together and a CMS can later replace it wholesale.
 * Answers must stay consistent with the shipping/returns/warranty policy pages.
 */

export type FaqItem = {
  id: string;
  qEn: string;
  qAr: string;
  aEn: string;
  aAr: string;
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "order",
    qEn: "How do I place an order?",
    qAr: "كيف أقوم بالطلب؟",
    aEn:
      "Browse the store, add the products you want to the cart, then open checkout. Enter your name, phone number, governorate and address, choose how you want to pay, and confirm. You will get an order number (FZ-…) right away and our team confirms the details on WhatsApp.",
    aAr:
      "تصفّح المتجر وأضف المنتجات التي تريدها إلى السلة، ثم افتح صفحة إتمام الطلب. أدخل اسمك ورقم هاتفك والمحافظة والعنوان، واختر طريقة الدفع، ثم أكّد الطلب. ستحصل فوراً على رقم طلب (FZ-…) ويؤكد فريقنا التفاصيل معك عبر واتساب.",
  },
  {
    id: "cod",
    qEn: "How does cash on delivery (COD) work?",
    qAr: "كيف يعمل الدفع عند الاستلام؟",
    aEn:
      "Cash on delivery is available in every governorate. You pay the courier in cash when the order reaches you — nothing is paid online. We recommend checking your items in front of the courier before paying.",
    aAr:
      "الدفع عند الاستلام متاح في جميع المحافظات. تدفع للمندوب نقداً عند وصول الطلب إليك — لا تدفع أي شيء عبر الإنترنت. ننصح بفحص المنتجات أمام المندوب قبل الدفع.",
  },
  {
    id: "deliveryTimes",
    qEn: "How long does delivery take?",
    qAr: "كم يستغرق التوصيل؟",
    aEn:
      "Baghdad: 1–2 business days. Other governorates: 2–5 business days depending on the courier route. Large or special-order items may take longer — our team confirms the timing on WhatsApp before dispatch.",
    aAr:
      "بغداد: 1–2 يوم عمل. بقية المحافظات: 2–5 أيام عمل حسب خط شركة التوصيل. القطع الكبيرة أو المطلوبة خصيصاً قد تستغرق وقتاً أطول — يؤكد فريقنا الموعد عبر واتساب قبل الإرسال.",
  },
  {
    id: "shippingFees",
    qEn: "How much does shipping cost?",
    qAr: "كم تبلغ رسوم التوصيل؟",
    aEn:
      "The delivery fee depends on your governorate and is shown at checkout before you confirm the order. Orders above the free-delivery threshold shown in the cart ship free, and store pickup is always free.",
    aAr:
      "تعتمد رسوم التوصيل على محافظتك وتظهر في صفحة إتمام الطلب قبل التأكيد. الطلبات التي تتجاوز حد التوصيل المجاني الظاهر في السلة تُشحن مجاناً، والاستلام من المعرض مجاني دائماً.",
  },
  {
    id: "payments",
    qEn: "What payment methods are available?",
    qAr: "ما طرق الدفع المتاحة؟",
    aEn:
      "Today you can pay cash on delivery or cash at the store when you pick up. Electronic payments (ZainCash, Qi Card, bank cards) are coming soon — until then they are coordinated with our team on WhatsApp, and this website never charges your card automatically.",
    aAr:
      "حالياً يمكنك الدفع نقداً عند الاستلام أو نقداً في المعرض عند الاستلام بنفسك. الدفع الإلكتروني (زين كاش، كي كارد، البطاقات المصرفية) قادم قريباً — وحتى ذلك الحين يتم تنسيقه مع فريقنا عبر واتساب، وهذا الموقع لا يخصم من بطاقتك تلقائياً أبداً.",
  },
  {
    id: "warrantyClaim",
    qEn: "How do I use the 2-year warranty?",
    qAr: "كيف أستفيد من ضمان السنتين؟",
    aEn:
      "Contact us on WhatsApp with your order number (FZ-…) plus photos or a short video of the issue, or bring the product to our showroom. Our team arranges inspection, repair or replacement — see the Warranty page for full coverage details and timelines.",
    aAr:
      "تواصل معنا عبر واتساب مع رقم طلبك (FZ-…) وصور أو فيديو قصير للمشكلة، أو أحضر المنتج إلى معرضنا. يرتب فريقنا الفحص أو الإصلاح أو الاستبدال — راجع صفحة الضمان لتفاصيل التغطية والمدد كاملة.",
  },
  {
    id: "returns",
    qEn: "Can I return or exchange a product?",
    qAr: "هل يمكنني إرجاع أو استبدال منتج؟",
    aEn:
      "Check your order in front of the courier — if an item arrives damaged or wrong, refuse it or contact us within 48 hours. Unopened products in their original packaging can be exchanged within 7 days of delivery. Software licenses, consumables and special-order items cannot be returned once activated or opened.",
    aAr:
      "افحص طلبك أمام المندوب — إذا وصل المنتج تالفاً أو مختلفاً، ارفض الاستلام أو تواصل معنا خلال 48 ساعة. المنتجات غير المفتوحة بغلافها الأصلي يمكن استبدالها خلال 7 أيام من الاستلام. الرخص البرمجية والمواد الاستهلاكية والقطع المطلوبة خصيصاً لا تُرجع بعد التفعيل أو الفتح.",
  },
  {
    id: "tracking",
    qEn: "How do I track my order?",
    qAr: "كيف أتتبع طلبي؟",
    aEn:
      "Open the Track Order page and enter your order number (FZ-…) with the phone number you used at checkout. You will see the live status and the order timeline. You can also ask our team on WhatsApp at any time.",
    aAr:
      "افتح صفحة تتبع الطلب وأدخل رقم الطلب (FZ-…) مع رقم الهاتف الذي استخدمته عند الطلب. ستظهر لك حالة الطلب وخط سير التحديثات مباشرة. يمكنك أيضاً سؤال فريقنا عبر واتساب في أي وقت.",
  },
  {
    id: "account",
    qEn: "Do I need an account to order?",
    qAr: "هل أحتاج إلى حساب للطلب؟",
    aEn:
      "No — guest checkout works with just your name and phone number. Creating an account is optional: it saves your details for next time and keeps your order history in one place.",
    aAr:
      "لا — يمكنك الطلب كزائر باسمك ورقم هاتفك فقط. إنشاء الحساب اختياري: يحفظ بياناتك للمرات القادمة ويجمع سجل طلباتك في مكان واحد.",
  },
  {
    id: "genuine",
    qEn: "Are your products new and genuine?",
    qAr: "هل منتجاتكم جديدة وأصلية؟",
    aEn:
      "Yes. Everything we sell is 100% brand new and original, sourced through authorized supply chains, and most products are backed by our 2-year store warranty.",
    aAr:
      "نعم. كل ما نبيعه جديد 100% وأصلي من قنوات توريد معتمدة، ومعظم المنتجات مدعومة بضمان المتجر لمدة سنتين.",
  },
  {
    id: "pickup",
    qEn: "Can I pick up my order from the store?",
    qAr: "هل يمكنني استلام طلبي من المعرض؟",
    aEn:
      "Yes — choose store pickup at checkout, then collect your order from our showroom and pay in cash at the counter. Pickup has no delivery fee, and you can inspect the product before paying.",
    aAr:
      "نعم — اختر «الاستلام من المعرض» في صفحة إتمام الطلب، ثم استلم طلبك من معرضنا وادفع نقداً عند الاستلام. لا توجد رسوم توصيل على الاستلام، ويمكنك فحص المنتج قبل الدفع.",
  },
  {
    id: "support",
    qEn: "How do I contact support?",
    qAr: "كيف أتواصل مع الدعم؟",
    aEn:
      "WhatsApp is the fastest way — the chat button is on every page. You can also call us Saturday to Thursday, 9:00 AM to 9:00 PM, send a message from the Contact page, or visit the showroom.",
    aAr:
      "واتساب هو الطريقة الأسرع — زر المحادثة موجود في كل صفحة. يمكنك أيضاً الاتصال بنا من السبت إلى الخميس، من 9 صباحاً حتى 9 مساءً، أو إرسال رسالة من صفحة «تواصل معنا»، أو زيارة المعرض.",
  },
];
