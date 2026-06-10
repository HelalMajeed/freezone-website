import type { AttributeType } from "@/lib/classification/types";

/** Bilingual attribute definition — DB `CategoryAttribute` or legacy `Category.facetKeys` JSON. */
export type FacetAttributeDef = {
  key: string;
  name_en: string;
  name_ar: string;
  type?: AttributeType;
  options?: string[];
  filterable?: boolean;
  searchable?: boolean;
  comparable?: boolean;
  displayGroup?: string;
  required?: boolean;
  unit?: string;
  displaySpecKey?: string;
  displaySpecNameEn?: string;
  displaySpecNameAr?: string;
  displaySpecGroup?: string;
  displaySpecRequired?: boolean;
  linkDisplaySpec?: boolean;
};

export interface Category {
  id: string;
  name: string;
  /** Arabic storefront name when seeding the DB (`nameEn` uses `name`). */
  nameAr?: string;
  icon: string;
  color: string;
  img: string | null;
  /** Parent category slug (one-level tree). Top-level categories omit it. */
  parent?: string;
  facetAttributes?: FacetAttributeDef[];
  facetKeys?: string[];
}

export interface Brand {
  name: string;
  img: string | null;
}

export interface Product {
  id: number;
  cat: string;
  /** Additional category slugs (storefront browse/filter); facets use `cat` only. */
  extraCats?: string[];
  brand: string;
  name: string;
  desc: string;
  price: number;
  oldPrice: number | null;
  originalPrice?: number | null;
  storage: string;
  inStock: boolean;
  featured: boolean;
  isNew: boolean;
  date: string;
  icon: string;
  rating: number;
  reviews: number;
  sales: number;
  images: string[];
  model3d: string | null;
  /** SKU / part number — shown as «Model» on the product page when set. */
  sku?: string;
  /** Product model name (e.g. ROG Strix G16). */
  model?: string;
  /** Warranty label shown on PDP + admin. Free-form text, optional. */
  warranty?: string;
  /** Full display strings on product detail page. */
  specs?: Record<string, string>;
  /** Normalized short values for category/search filters only. */
  filterValues?: Record<string, string>;
}

export const CATEGORIES: Category[] = [
  { id: "gaming", name: "Gaming", nameAr: "الألعاب", icon: "🎮", color: "#DC2626", img: null },
  { id: "security", name: "Security Systems", nameAr: "أنظمة الحماية", icon: "🔐", color: "#1D4ED8", img: null },
  { id: "cctv", name: "CCTV", nameAr: "كاميرات المراقبة", icon: "📹", color: "#7C3AED", img: null },
  { id: "computers", name: "Computers", nameAr: "الحواسيب", icon: "💻", color: "#059669", img: null },
  { id: "laptops", name: "Laptops", nameAr: "اللابتوبات", icon: "💻", color: "#0369A1", img: null },
  { id: "monitors", name: "Monitors", nameAr: "الشاشات", icon: "🖥️", color: "#D97706", img: null },
  { id: "printers", name: "Printers", nameAr: "الطابعات", icon: "🖨️", color: "#DB2777", img: null },
  { id: "electric", name: "Electric Solutions", nameAr: "الحلول الكهربائية", icon: "⚡", color: "#0891B2", img: null },
  { id: "software", name: "Software", nameAr: "البرمجيات", icon: "💿", color: "#65A30D", img: null },
  { id: "hardware", name: "Hardware & Dev", nameAr: "العتاد والتطوير", icon: "🔧", color: "#F97316", img: null },
  { id: "networking", name: "Networking", nameAr: "الشبكات", icon: "🌐", color: "#0E7490", img: null },
  { id: "components", name: "PC Components", nameAr: "مكوّنات الحاسوب", icon: "⚙️", color: "#4B5563", img: null },
  { id: "accessories", name: "Accessories", nameAr: "الإكسسوارات", icon: "🎧", color: "#8B5CF6", img: null },
  { id: "all-in-one", name: "All-in-One", nameAr: "أجهزة الكل في واحد", icon: "🖥️", color: "#0EA5E9", img: null },
  { id: "smart-home", name: "Smart Home", nameAr: "المنزل الذكي", icon: "🏠", color: "#14B8A6", img: null },
  { id: "phones", name: "Phones", nameAr: "الهواتف", icon: "📱", color: "#6366F1", img: null },
  {
    id: "tablets",
    name: "Tablets & iPad",
    nameAr: "تابلت وأيباد",
    icon: "📱",
    color: "#9333EA",
    img: null,
  },
  { id: "power-solutions", name: "Power Solutions", nameAr: "حلول الطاقة", icon: "🔋", color: "#CA8A04", img: null },
  /**
   * Child categories (one-level tree via Category.parentId, linked by `parent`
   * slug). Children are listed AFTER every top-level entry so seeding can
   * resolve parents in one array pass and catalog order keeps the homepage
   * tiles/strips on top-level categories. Existing top-level slugs (laptops,
   * monitors, printers, components, cctv, …) intentionally stay top-level —
   * re-parenting them would change live pages that already carry products.
   */
  // Security & Surveillance (parent: security; cctv stays a top-level sibling)
  { id: "ip-cameras", name: "IP Cameras", nameAr: "كاميرات IP", icon: "📷", color: "#1D4ED8", img: null, parent: "security" },
  { id: "dvr-nvr", name: "DVR/NVR Systems", nameAr: "أجهزة التسجيل DVR/NVR", icon: "📼", color: "#1D4ED8", img: null, parent: "security" },
  { id: "wifi-cameras", name: "WiFi Cameras", nameAr: "كاميرات واي فاي", icon: "📶", color: "#1D4ED8", img: null, parent: "security" },
  { id: "alarm-systems", name: "Alarm Systems", nameAr: "أنظمة الإنذار", icon: "🚨", color: "#1D4ED8", img: null, parent: "security" },
  { id: "fingerprint-attendance", name: "Fingerprint & Attendance", nameAr: "أجهزة البصمة والدوام", icon: "🖐️", color: "#1D4ED8", img: null, parent: "security" },
  { id: "smart-locks", name: "Smart Locks", nameAr: "الأقفال الذكية", icon: "🔒", color: "#1D4ED8", img: null, parent: "security" },
  { id: "intercom", name: "Intercom", nameAr: "الإنتركم", icon: "📞", color: "#1D4ED8", img: null, parent: "security" },
  // Computers (monitors/printers/components stay top-level — see note above)
  { id: "business-laptops", name: "Business Laptops", nameAr: "لابتوبات الأعمال", icon: "💼", color: "#059669", img: null, parent: "computers" },
  { id: "gaming-laptops", name: "Gaming Laptops", nameAr: "لابتوبات الألعاب", icon: "🎮", color: "#059669", img: null, parent: "computers" },
  { id: "everyday-laptops", name: "Everyday Laptops", nameAr: "لابتوبات الاستخدام اليومي", icon: "💻", color: "#059669", img: null, parent: "computers" },
  { id: "desktops-builds", name: "Desktops & Builds", nameAr: "حواسيب مكتبية وتجميعات", icon: "🖥️", color: "#059669", img: null, parent: "computers" },
  // Gaming
  { id: "consoles", name: "Consoles", nameAr: "منصات الألعاب", icon: "🕹️", color: "#DC2626", img: null, parent: "gaming" },
  { id: "controllers", name: "Controllers", nameAr: "أذرع التحكم", icon: "🎮", color: "#DC2626", img: null, parent: "gaming" },
  { id: "gaming-accessories", name: "Gaming Accessories", nameAr: "إكسسوارات الألعاب", icon: "🎧", color: "#DC2626", img: null, parent: "gaming" },
  // Networking
  { id: "routers", name: "Routers", nameAr: "الراوترات", icon: "📡", color: "#0E7490", img: null, parent: "networking" },
  { id: "access-points", name: "Access Points", nameAr: "نقاط الوصول", icon: "📶", color: "#0E7490", img: null, parent: "networking" },
  { id: "switches", name: "Switches", nameAr: "السويتشات", icon: "🔀", color: "#0E7490", img: null, parent: "networking" },
  { id: "cables-tools", name: "Cables & Tools", nameAr: "الكوابل والأدوات", icon: "🔌", color: "#0E7490", img: null, parent: "networking" },
  // Smart Home
  { id: "smart-lighting", name: "Smart Lighting", nameAr: "الإضاءة الذكية", icon: "💡", color: "#14B8A6", img: null, parent: "smart-home" },
  { id: "plugs-switches", name: "Plugs & Switches", nameAr: "المقابس والمفاتيح الذكية", icon: "🔌", color: "#14B8A6", img: null, parent: "smart-home" },
  { id: "sensors", name: "Sensors", nameAr: "الحساسات", icon: "🌡️", color: "#14B8A6", img: null, parent: "smart-home" },
  { id: "smart-hubs", name: "Hubs", nameAr: "وحدات التحكم الذكية", icon: "🏠", color: "#14B8A6", img: null, parent: "smart-home" },
  // Power Solutions
  { id: "ups", name: "UPS", nameAr: "أجهزة UPS", icon: "🔋", color: "#CA8A04", img: null, parent: "power-solutions" },
  { id: "inverters", name: "Inverters", nameAr: "الانفرترات", icon: "⚡", color: "#CA8A04", img: null, parent: "power-solutions" },
  { id: "lithium-batteries", name: "Lithium Batteries", nameAr: "بطاريات الليثيوم", icon: "🔋", color: "#CA8A04", img: null, parent: "power-solutions" },
  { id: "solar-systems", name: "Solar Systems", nameAr: "منظومات الطاقة الشمسية", icon: "☀️", color: "#CA8A04", img: null, parent: "power-solutions" },
  { id: "converters", name: "Converters", nameAr: "المحولات", icon: "🔌", color: "#CA8A04", img: null, parent: "power-solutions" },
];

/** Local SVGs in /public/brands — colored wordmarks, no external CDN (reliable + brand colors). */
const brandSvg = (file: string) => `/brands/${file}.svg`;

export const BRANDS: Brand[] = [
  { name: "ADATA", img: brandSvg("adata") },
  { name: "Logitech", img: brandSvg("logitech") },
  { name: "Apple", img: brandSvg("apple") },
  { name: "Gigabyte", img: brandSvg("gigabyte") },
  { name: "MSI", img: brandSvg("msi") },
  { name: "HP", img: brandSvg("hp") },
  { name: "Lenovo", img: brandSvg("lenovo") },
  { name: "ASUS", img: brandSvg("asus") },
];

export const PRODUCTS: Product[] = [];
export const BANNERS = [
  { id: 1, title: "Level Up Your Gaming", sub: "RTX 4090 · MSI Rigs · 240Hz · Pro Gear", bg1: "#0d0000", bg2: "#B91C1C", cat: "gaming", icon: "🎮", img: null },
  { id: 2, title: "Total Security Solutions", sub: "CCTV · NVR · Access Control · Alarm", bg1: "#020b1a", bg2: "#1D4ED8", cat: "security", icon: "🔐", img: null },
  { id: 3, title: "Best Prices on Top Tech", sub: "Computers · Monitors · Printers · UPS", bg1: "#1a0800", bg2: "#EA580C", cat: "computers", icon: "💻", img: null },
];
