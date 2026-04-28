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
          { labelEn: "ASUS / MSI", labelAr: "أسوس / إم إس آي", href: "/products?brand=ASUS" },
        ],
      },
      {
        titleEn: "Business",
        titleAr: "أعمال",
        items: [
          { labelEn: "Business laptops", labelAr: "لابتوبات أعمال", href: "/products?cat=computers" },
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
