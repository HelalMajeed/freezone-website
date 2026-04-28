import type { StoredNavItem } from "@/lib/cms-types";

/** Minimal example mega-menu for «تحميل مثال» in admin (bilingual labels). */
export const DEFAULT_STORED_NAV_EXAMPLE: StoredNavItem[] = [
  {
    id: "laptops",
    labelEn: "Laptops & Computers",
    labelAr: "لابتوبات وحواسيب",
    href: "/products?cat=gaming",
    iconKey: "laptop",
    columns: [
      {
        titleEn: "Gaming",
        titleAr: "ألعاب",
        items: [
          { labelEn: "All gaming laptops", labelAr: "كل لابتوبات الألعاب", href: "/products?cat=gaming" },
          { labelEn: "ASUS gaming laptops", labelAr: "لابتوبات أسوس للألعاب", href: "/products?brand=ASUS&cat=gaming" },
          { labelEn: "MSI gaming laptops", labelAr: "لابتوبات إم إس آي للألعاب", href: "/products?brand=MSI&cat=gaming" },
        ],
      },
      {
        titleEn: "Business",
        titleAr: "أعمال",
        items: [
          { labelEn: "Business laptops", labelAr: "لابتوبات أعمال", href: "/products?cat=laptops&q=business" },
        ],
      },
    ],
  },
  {
    id: "components",
    labelEn: "PC Components",
    labelAr: "مكوّنات PC",
    href: "/products?cat=components",
    iconKey: "cpu",
    columns: [
      {
        titleEn: "Core",
        titleAr: "أساسية",
        highlight: true,
        items: [
          { labelEn: "CPUs", labelAr: "معالجات", href: "/products?cat=components" },
          { labelEn: "GPUs", labelAr: "كروت شاشة", href: "/products?cat=components" },
        ],
      },
    ],
  },
];
