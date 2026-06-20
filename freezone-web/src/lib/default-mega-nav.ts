import type { NavItemResolved, MegaMenuColumn } from "@/lib/nav-types";
import { Gamepad2, Monitor, Shield, Battery, HardDrive, Smartphone, type LucideIcon } from "lucide-react";

/**
 * Default mega-menu used when CMS `navItems` is empty. Bilingual so the desktop
 * category bar AND the mobile drawer render localized labels on the Arabic-default
 * storefront (previously English-only). Six commerce groups for the Iraqi / MENA
 * electronics market. CMS-configured nav still overrides this via storedNavToResolved.
 */
type Loc = "en" | "ar";
type SrcItem = { en: string; ar: string; href: string };
type SrcCol = { titleEn: string; titleAr: string; items: SrcItem[]; highlight?: boolean; cta?: boolean };
type SrcNav = { id: string; labelEn: string; labelAr: string; icon: LucideIcon; href: string; columns: SrcCol[] };

const SRC: SrcNav[] = [
  {
    id: "personal-devices",
    labelEn: "Personal Devices",
    labelAr: "الأجهزة الشخصية",
    icon: Smartphone,
    href: "/products?cat=laptops",
    columns: [
      {
        titleEn: "Laptops & AIO",
        titleAr: "اللابتوبات والكل في واحد",
        items: [
          { en: "All Laptops", ar: "كل اللابتوبات", href: "/products?cat=laptops" },
          { en: "Gaming Laptops", ar: "لابتوبات الألعاب", href: "/products?cat=gaming" },
          { en: "Business & Study", ar: "للأعمال والدراسة", href: "/products?cat=laptops&q=business" },
          { en: "All-in-One PCs", ar: "أجهزة الكل في واحد", href: "/products?cat=all-in-one" },
          { en: "Apple MacBook", ar: "آبل ماك بوك", href: "/products?brand=Apple&cat=laptops" },
        ],
      },
      {
        titleEn: "Mobile",
        titleAr: "الهواتف",
        items: [
          { en: "Smartphones", ar: "الهواتف الذكية", href: "/products?cat=phones" },
          { en: "Tablets & iPad", ar: "التابلت والآيباد", href: "/products?cat=tablets" },
          { en: "Mobile Accessories", ar: "ملحقات الهواتف", href: "/products?cat=accessories&q=mobile" },
        ],
      },
      {
        titleEn: "Featured",
        titleAr: "مميّزة",
        highlight: true,
        items: [
          { en: "New Arrivals", ar: "وصل حديثاً", href: "/products?isNew=true" },
          { en: "Best Sellers", ar: "الأكثر مبيعاً", href: "/products?featured=true" },
        ],
      },
    ],
  },
  {
    id: "gaming-pc",
    labelEn: "Gaming & PC",
    labelAr: "الألعاب والحاسبات",
    icon: Gamepad2,
    href: "/products?cat=gaming",
    columns: [
      {
        titleEn: "Gaming Systems",
        titleAr: "أنظمة الألعاب",
        items: [
          { en: "Gaming PCs", ar: "حواسيب الألعاب", href: "/products?cat=gaming" },
          { en: "PC Builder", ar: "تجميع حاسبتك", href: "/pc-builder" },
          { en: "Consoles — PS5 / Xbox / Switch", ar: "المنصات — PS5 / Xbox / Switch", href: "/products?cat=components&q=console" },
        ],
      },
      {
        titleEn: "Components",
        titleAr: "المكوّنات",
        items: [
          { en: "Graphics Cards", ar: "كروت الشاشة", href: "/products?cat=components&q=GPU" },
          { en: "Processors (CPU)", ar: "المعالجات (CPU)", href: "/products?cat=components&q=CPU" },
          { en: "RAM & Storage", ar: "الذاكرة والتخزين", href: "/products?cat=components&q=RAM" },
          { en: "Cases & Cooling", ar: "الصناديق والتبريد", href: "/products?cat=components&q=case" },
        ],
      },
      {
        titleEn: "Gaming Gear",
        titleAr: "عتاد الألعاب",
        highlight: true,
        items: [
          { en: "Gaming Accessories", ar: "إكسسوارات الألعاب", href: "/products?cat=accessories&q=gaming" },
          { en: "Controllers & Headsets", ar: "أذرع وسماعات", href: "/products?cat=accessories&q=controller" },
        ],
      },
    ],
  },
  {
    id: "display-audio",
    labelEn: "Display & Audio",
    labelAr: "الشاشات والصوت",
    icon: Monitor,
    href: "/products?cat=monitors",
    columns: [
      {
        titleEn: "Displays",
        titleAr: "الشاشات",
        items: [
          { en: "Monitors — Gaming & Office", ar: "شاشات — ألعاب ومكتب", href: "/products?cat=monitors" },
          { en: "Projectors / Data Show", ar: "أجهزة العرض (داتا شو)", href: "/products?cat=monitors&q=projector" },
          { en: "Monitor Accessories", ar: "ملحقات الشاشات", href: "/products?cat=accessories&q=monitor" },
        ],
      },
      {
        titleEn: "Audio",
        titleAr: "الصوت",
        items: [
          { en: "Headsets & Earbuds", ar: "سماعات الرأس والأذن", href: "/products?cat=accessories&q=audio" },
          { en: "Speakers", ar: "مكبّرات الصوت", href: "/products?cat=accessories&q=speaker" },
        ],
      },
      {
        titleEn: "Pro & Creative",
        titleAr: "احترافي وإبداعي",
        highlight: true,
        items: [
          { en: "High-refresh Gaming", ar: "تردّد عالٍ للألعاب", href: "/products?cat=monitors&q=144hz" },
          { en: "4K & Ultrawide", ar: "دقة 4K وشاشات عريضة", href: "/products?cat=monitors&q=4K" },
        ],
      },
    ],
  },
  {
    id: "security-smart",
    labelEn: "Security & Smart",
    labelAr: "الحماية والذكي",
    icon: Shield,
    href: "/products?cat=cctv",
    columns: [
      {
        titleEn: "CCTV & Surveillance",
        titleAr: "المراقبة والكاميرات",
        items: [
          { en: "IP / CCTV Cameras", ar: "كاميرات IP / مراقبة", href: "/products?cat=cctv" },
          { en: "NVR / DVR Systems", ar: "أنظمة NVR / DVR", href: "/products?cat=security" },
          { en: "Camera Accessories", ar: "ملحقات الكاميرات", href: "/products?cat=accessories&q=camera" },
        ],
      },
      {
        titleEn: "Smart Home",
        titleAr: "المنزل الذكي",
        items: [
          { en: "Smart Home Hubs", ar: "وحدات التحكّم الذكية", href: "/products?cat=smart-home" },
          { en: "Sensors & Automation", ar: "الحساسات والأتمتة", href: "/products?cat=smart-home&q=automation" },
        ],
      },
      {
        titleEn: "Business Security",
        titleAr: "حماية الأعمال",
        highlight: true,
        items: [
          { en: "Retail & Office CCTV", ar: "مراقبة المتاجر والمكاتب", href: "/products?cat=security&q=office" },
        ],
      },
    ],
  },
  {
    id: "power-solutions",
    labelEn: "Power Solutions",
    labelAr: "حلول الطاقة",
    icon: Battery,
    href: "/products?cat=power-solutions",
    columns: [
      {
        titleEn: "UPS & Protection",
        titleAr: "UPS والحماية",
        items: [
          { en: "UPS — Home & Office", ar: "UPS — منزلي ومكتبي", href: "/products?cat=power-solutions&q=UPS" },
          { en: "Line-interactive / Online", ar: "لاين-إنتراكتيف / أونلاين", href: "/products?cat=power-solutions" },
        ],
      },
      {
        titleEn: "Solar & Energy",
        titleAr: "الطاقة الشمسية",
        items: [
          { en: "Solar Energy Kits", ar: "منظومات الطاقة الشمسية", href: "/products?cat=electric&q=solar" },
          { en: "Power Accessories", ar: "ملحقات الطاقة", href: "/products?cat=electric" },
        ],
      },
      {
        titleEn: "Iraq-ready",
        titleAr: "جاهز للعراق",
        highlight: true,
        cta: true,
        items: [
          { en: "Protect devices from outages", ar: "احمِ أجهزتك من انقطاع الكهرباء", href: "/products?cat=power-solutions" },
        ],
      },
    ],
  },
  {
    id: "storage-accessories",
    labelEn: "Storage & Accessories",
    labelAr: "التخزين والإكسسوارات",
    icon: HardDrive,
    href: "/products?cat=accessories",
    columns: [
      {
        titleEn: "Storage",
        titleAr: "التخزين",
        items: [
          { en: "SSD / HDD / NAS", ar: "SSD / HDD / NAS", href: "/products?cat=accessories&q=storage" },
          { en: "External Drives", ar: "الأقراص الخارجية", href: "/products?cat=accessories&q=external" },
        ],
      },
      {
        titleEn: "Accessories Hub",
        titleAr: "مركز الإكسسوارات",
        items: [
          { en: "Laptop Accessories", ar: "ملحقات اللابتوب", href: "/products?cat=accessories&q=laptop" },
          { en: "PC & Desk Accessories", ar: "ملحقات الحاسبة والمكتب", href: "/products?cat=accessories&q=pc" },
          { en: "Cables & Adapters", ar: "الكوابل والمحوّلات", href: "/products?cat=accessories&q=cable" },
          { en: "Keyboards & Mice", ar: "لوحات المفاتيح والفأرة", href: "/products?cat=accessories&q=keyboard" },
        ],
      },
      {
        titleEn: "Also shop",
        titleAr: "تسوّق أيضاً",
        highlight: true,
        items: [
          { en: "Printers & Supplies", ar: "الطابعات والمستلزمات", href: "/products?cat=printers" },
          { en: "Networking", ar: "الشبكات", href: "/products?cat=networking" },
        ],
      },
    ],
  },
];

function pickColumn(c: SrcCol, locale: Loc): MegaMenuColumn {
  return {
    title: locale === "ar" ? c.titleAr : c.titleEn,
    items: c.items.map((i) => ({ label: locale === "ar" ? i.ar : i.en, href: i.href })),
    highlight: c.highlight,
    cta: c.cta,
  };
}

/** Localized default mega-nav (used by NavBar desktop bar + mobile drawer when CMS nav is empty). */
export function buildDefaultNavItems(locale: Loc): NavItemResolved[] {
  return SRC.map((n) => ({
    id: n.id,
    label: locale === "ar" ? n.labelAr : n.labelEn,
    icon: n.icon,
    href: n.href,
    columns: n.columns.map((c) => pickColumn(c, locale)),
  }));
}

/** Backward-compatible English default for any non-localized importer. */
export const DEFAULT_NAV_ITEMS: NavItemResolved[] = buildDefaultNavItems("en");
