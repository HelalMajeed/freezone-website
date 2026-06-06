/**
 * One-click payloads for «شريط منتجات» rails (same section type `featured_products`).
 * Add multiple sections from the builder and apply a preset, or duplicate and tweak.
 */
export const FEATURED_PRODUCT_RAIL_PRESETS: { id: string; labelAr: string; labelEn: string; payload: Record<string, unknown> }[] = [
  {
    id: "laptops",
    labelAr: "لابتوبات وحواسيب",
    labelEn: "Laptops & computers",
    payload: {
      titleAr: "اللابتوبات والحواسيب",
      titleEn: "Laptops & Computers",
      link: "/products?cat=gaming",
      filter: "cat",
      catSlug: "gaming,computers,laptops",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
  {
    id: "monitors",
    labelAr: "شاشات",
    labelEn: "Monitors",
    payload: {
      titleAr: "الشاشات",
      titleEn: "Monitors",
      link: "/products?cat=monitors",
      filter: "cat",
      catSlug: "monitors",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
  {
    id: "security",
    labelAr: "أمن ومراقبة",
    labelEn: "Security systems",
    payload: {
      titleAr: "أنظمة الأمن والمراقبة",
      titleEn: "Security & surveillance",
      link: "/products?cat=security",
      filter: "cat",
      catSlug: "security,cctv",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
  {
    id: "accessories",
    labelAr: "إكسسوارات",
    labelEn: "Accessories",
    payload: {
      titleAr: "الإكسسوارات",
      titleEn: "Accessories",
      link: "/products?cat=accessories",
      filter: "cat",
      catSlug: "accessories",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
  {
    id: "smart_home",
    labelAr: "المنزل الذكي",
    labelEn: "Smart home",
    payload: {
      titleAr: "المنزل الذكي",
      titleEn: "Smart Home",
      link: "/products?cat=smart-home",
      filter: "cat",
      catSlug: "smart-home",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
  {
    id: "all_in_one",
    labelAr: "الكل في واحد",
    labelEn: "All-in-One",
    payload: {
      titleAr: "الكل في واحد",
      titleEn: "ALL IN ONE",
      link: "/products?cat=all-in-one",
      filter: "cat",
      catSlug: "all-in-one",
      limit: 24,
      viewAllAr: "",
      viewAllEn: "",
      ctaVariant: "gray",
      bgColor: "var(--color-neutral-50)",
    },
  },
];

/** Default draft JSON per section type (admin templates) */
export function defaultDraftPayload(type: string): Record<string, unknown> {
  switch (type) {
    case "hero":
      return { source: "global" };
    case "trust_bar":
      return { source: "global" };
    case "category_strip":
      return { source: "global" };
    case "featured_products":
      return {
        titleAr: "وصل حديثاً",
        titleEn: "New arrivals",
        link: "/products?isNew=true",
        filter: "new",
        limit: 12,
        viewAllAr: "",
        viewAllEn: "",
        ctaVariant: "gray",
        bgColor: "var(--color-neutral-50)",
      };
    case "brands_strip":
      return { titleAr: "علامات تجارية", titleEn: "Brands" };
    case "banner_slider":
      return {
        items: [
          {
            titleAr: "بانر 1",
            titleEn: "Banner 1",
            imageUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1200",
            href: "/products",
          },
        ],
      };
    case "categories_showcase":
      return { source: "gaming_grid" };
    case "promo_mega":
      return { count: 20, slots: [] };
    case "tabbed_products":
      return {
        eyebrowAr: "المنتجات المميزة",
        eyebrowEn: "Featured products",
        titleAr: "اكتشف أحدث التقنيات",
        titleEn: "Discover the latest tech",
        viewAllLink: "/products",
        limit: 24,
        tabStyle: "grouped",
        tabs: [
          { id: "t-new", labelAr: "الوافدون الجدد", labelEn: "New Arrivals", mode: "new" },
          { id: "t-feat", labelAr: "المميزون", labelEn: "Featured", mode: "featured" },
          { id: "t-game", labelAr: "أجهزة الكمبيوتر المحمولة للألعاب", labelEn: "Gaming Laptops", mode: "gaming" },
          { id: "t-pc", labelAr: "مكونات الحاسوب الشخصي", labelEn: "PC Components", mode: "components" },
        ],
      };
    case "promo_grid":
      return {
        items: [
          { titleAr: "عروض", titleEn: "Deals", imageUrl: "https://images.unsplash.com/photo-1598327105666-5b89351cb31b?q=80&w=800", href: "/products" },
        ],
      };
    case "testimonials":
      return {
        items: [{ textAr: "خدمة ممتازة", textEn: "Great service", nameAr: "عميل", nameEn: "Customer" }],
      };
    case "faq":
      return { source: "i18n" };
    case "cta":
      return {
        titleAr: "تسوق الآن",
        titleEn: "Shop now",
        subtitleAr: "",
        subtitleEn: "",
        buttonAr: "منتجات",
        buttonEn: "Products",
        href: "/products",
        bg: "#0f172a",
      };
    case "split_richtext":
      return {
        titleAr: "عنوان",
        titleEn: "Title",
        bodyAr: "نص توضيحي",
        bodyEn: "Body text",
        imageUrl: "https://images.unsplash.com/photo-1527443195645-1133f7f28990?q=80&w=800",
        imageSide: "right",
      };
    case "showroom":
      return { source: "global" };
    default:
      return {};
  }
}

export const SECTION_TYPES: { type: string; labelAr: string }[] = [
  { type: "hero", labelAr: "هيرو (CMS العالمي)" },
  { type: "trust_bar", labelAr: "شريط الثقة" },
  { type: "category_strip", labelAr: "أيقونات الأقسام" },
  {
    type: "featured_products",
    labelAr: "شريط منتجات أفقي (فئات / جدد / مميز)",
  },
  { type: "brands_strip", labelAr: "شريط العلامات" },
  { type: "banner_slider", labelAr: "بانرات صور" },
  { type: "categories_showcase", labelAr: "شبكة أقسام (ألعاب)" },
  { type: "promo_mega", labelAr: "ميجا بلوكات" },
  { type: "promo_grid", labelAr: "شبكة عروض" },
  { type: "tabbed_products", labelAr: "تبويب منتجات" },
  { type: "testimonials", labelAr: "آراء العملاء" },
  { type: "faq", labelAr: "أسئلة شائعة" },
  { type: "cta", labelAr: "دعوة لإجراء" },
  { type: "split_richtext", labelAr: "نص + صورة" },
  { type: "showroom", labelAr: "معرض الصور" },
];
