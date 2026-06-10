import type { CmsHeroSlideRow } from "@/lib/layout-cms";

/**
 * Snapshot شكلها مثل استجابة GET /api/admin/cms عندما لا يوجد DATABASE_URL
 * حتى تُحمَّل لوحة التحكم والمعاينة؛ الحفظ يبقى يتطلب Postgres.
 */
export function getOfflineCmsPayload() {
  const siteConfig = {
    id: 1,
    storeNameEn: "Store",
    storeNameAr: "المتجر",
    taglineEn: "Iraq's trusted tech — CCTV, computers, gaming.",
    taglineAr: "تقنية موثوقة في العراق — كاميرات، حواسيب، ألعاب.",
    logoUrl: null as string | null,
    headerLogoHeightPx: 48,
    phone: "+964 000 000 0000",
    email: "contact@example.com",
    addressEn: "Baghdad, Iraq — Tech Center Area",
    addressAr: "بغداد، العراق",
    whatsapp: "+9647742222377",
    zainCashWallet: "",
    qiCardMerchantId: "",
    freeDeliveryThreshold: 100000,
    standardShippingFee: 5000,
    promoBarTextEn: "FREE DELIVERY ON ORDERS OVER 100,000 IQD",
    promoBarTextAr: "توصيل مجاني للطلبات فوق 100,000 د.ع",
    promoBarEnabled: true,
    topBarBgColor: "#0a0e1a",
    topBarContactColor: "rgba(255,255,255,0.65)",
    topBarPhoneLabelEn: "",
    topBarPhoneLabelAr: "",
    topBarWhatsappLabelEn: "WhatsApp",
    topBarWhatsappLabelAr: "واتساب",
    topBarPhoneIconKey: "phone",
    topBarWhatsappIconKey: "message-circle",
    topBarPromoIconKey: "zap",
    topBarPromoColor: "#10b981",
    topBarPromoHref: null as string | null,
    topBarPhoneHref: null as string | null,
    topBarWhatsappHref: null as string | null,
    topBarSocialEnabled: true,
    topBarSocialIconSizePx: 20,
    topBarSocialGapPx: 14,
    topBarSocialColor: "#B00000",
    maintenanceMode: false,
    heroAutoplayMs: 7000,
    heroScrimOpacityPct: 25,
    heroNavArrowColor: "#ffffff",
    heroNavArrowOpacityPct: 80,
    heroNavBoxColor: "#ffffff",
    heroNavBoxOpacityPct: 8,
    trustBarBgColor: "#030712",
    trustBarBgOpacityPct: 100,
    trustBarTextColor: "#f8fafc",
    trustBarIconColor: "",
    navItemsJson: null,
    metaTitleEn: null as string | null,
    metaTitleAr: null as string | null,
    metaDescriptionEn: null as string | null,
    metaDescriptionAr: null as string | null,
    seoKeywords: null as string | null,
    homePageCopyJson: null as unknown | null,
  };

  const socialLinks = [
    { id: 1, platform: "facebook", url: "https://facebook.com", sortOrder: 0, showInTopBar: true },
    { id: 2, platform: "instagram", url: "https://instagram.com", sortOrder: 1, showInTopBar: true },
    { id: 3, platform: "tiktok", url: "https://tiktok.com", sortOrder: 2, showInTopBar: true },
  ];

  const trustBarItems = [
    { id: 1, textEn: "Fast Nationwide Delivery", textAr: "توصيل سريع", iconKey: "truck", sortOrder: 0 },
    { id: 2, textEn: "100% Genuine Products", textAr: "منتجات أصلية 100٪", iconKey: "shield-check", sortOrder: 1 },
    { id: 3, textEn: "Easy 30-Day Returns", textAr: "إرجاع خلال 30 يوماً", iconKey: "repeat", sortOrder: 2 },
    { id: 4, textEn: "24/7 Expert Support", textAr: "دعم فني متواصل", iconKey: "headphones", sortOrder: 3 },
  ];

  const homeSpotlights = [
    { id: 1, labelEn: "Laptops", labelAr: "لابتوبات", href: "/products?cat=gaming", imageUrl: null, iconKey: "laptop", sortOrder: 0, active: true },
    { id: 2, labelEn: "Monitors", labelAr: "شاشات", href: "/products?cat=monitors", imageUrl: null, iconKey: "monitor", sortOrder: 1, active: true },
    { id: 3, labelEn: "Gaming PCs", labelAr: "أجهزة ألعاب", href: "/products?cat=components", imageUrl: null, iconKey: "gamepad-2", sortOrder: 2, active: true },
    { id: 4, labelEn: "Components", labelAr: "مكونات", href: "/products?cat=components", imageUrl: null, iconKey: "cpu", sortOrder: 3, active: true },
    { id: 5, labelEn: "Accessories", labelAr: "إكسسوارات", href: "/products?cat=accessories", imageUrl: null, iconKey: "headphones", sortOrder: 4, active: true },
    { id: 6, labelEn: "Printers", labelAr: "طابعات", href: "/products?cat=printers", imageUrl: null, iconKey: "printer", sortOrder: 5, active: true },
    { id: 7, labelEn: "Network", labelAr: "شبكات", href: "/products?cat=networking", imageUrl: null, iconKey: "shield-check", sortOrder: 6, active: true },
    { id: 8, labelEn: "Cables", labelAr: "كوابل", href: "/products?cat=accessories", imageUrl: null, iconKey: "package", sortOrder: 7, active: true },
  ];

  const heroSlides: CmsHeroSlideRow[] = [
    {
      id: 1,
      sortOrder: 0,
      layoutMode: "structured",
      freeformLayers: null,
      badgeEn: "NEW ARRIVAL",
      badgeAr: "وصل حديثاً",
      titleLine1En: "PREDATOR ",
      titleLine1Ar: "بريداتور ",
      titleLine2En: "UNLEASHED",
      titleLine2Ar: "مُطلَق",
      descEn:
        "Dominate the battlefield with unrivaled power — 240Hz displays and revolutionary cooling.",
      descAr: "سيطر بأداء لا مثيل له — شاشات 240Hz وتبريد متطور.",
      imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1920",
      primaryLabelEn: "VIEW DETAILS",
      primaryLabelAr: "التفاصيل",
      primaryHref: "/products?cat=gaming",
      primaryLink: null,
      secondaryLabelEn: "ALL GAMING",
      secondaryLabelAr: "كل الألعاب",
      secondaryHref: "/products?cat=gaming",
      secondaryLink: null,
      active: true,
      stats: [
        { id: "a", value: "240Hz", label: "DISPLAY" },
        { id: "b", value: "RTX", label: "GRAPHICS" },
        { id: "c", value: "<1ms", label: "RESPONSE" },
      ],
    },
  ];

  return {
    mode: "offline" as const,
    siteConfig,
    socialLinks,
    trustBarItems,
    homeSpotlights,
    heroSlides,
    showroomMedia: [] as { id: number; kind: string; url: string; titleEn: string | null; titleAr: string | null; sortOrder: number }[],
    promoBanners: [] as {
      id: number;
      titleEn: string;
      titleAr: string;
      subEn: string;
      subAr: string;
      imageUrl: string;
      href: string;
      catSlug: string | null;
      sortOrder: number;
      active: boolean;
    }[],
  };
}

/** نفس الحمولة مع سبب إضافي للواجهة (فشل اتصال رغم وجود DATABASE_URL). */
export function getOfflineCmsPayloadDbUnreachable() {
  return {
    ...getOfflineCmsPayload(),
    dbUnavailable: true as const,
  };
}
