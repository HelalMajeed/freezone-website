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
};

export interface Category {
  id: string;
  name: string;
  /** Arabic storefront name when seeding the DB (`nameEn` uses `name`). */
  nameAr?: string;
  icon: string;
  color: string;
  img: string | null;
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
  /** Display strings for category-specific filters (CPU, GPU, screen size, etc.). */
  specs?: Record<string, string>;
}

export const CATEGORIES: Category[] = [
  { id: "gaming", name: "Gaming", icon: "🎮", color: "#DC2626", img: null },
  { id: "security", name: "Security Systems", icon: "🔐", color: "#1D4ED8", img: null },
  { id: "cctv", name: "CCTV", icon: "📹", color: "#7C3AED", img: null },
  { id: "computers", name: "Computers", icon: "💻", color: "#059669", img: null },
  { id: "laptops", name: "Laptops", icon: "💻", color: "#0369A1", img: null },
  { id: "monitors", name: "Monitors", icon: "🖥️", color: "#D97706", img: null },
  { id: "printers", name: "Printers", icon: "🖨️", color: "#DB2777", img: null },
  { id: "electric", name: "Electric Solutions", icon: "⚡", color: "#0891B2", img: null },
  { id: "software", name: "Software", icon: "💿", color: "#65A30D", img: null },
  { id: "hardware", name: "Hardware & Dev", icon: "🔧", color: "#F97316", img: null },
  { id: "components", name: "PC Components", icon: "⚙️", color: "#4B5563", img: null },
  { id: "accessories", name: "Accessories", icon: "🎧", color: "#8B5CF6", img: null },
  { id: "all-in-one", name: "All-in-One", icon: "🖥️", color: "#0EA5E9", img: null },
  { id: "smart-home", name: "Smart Home", icon: "🏠", color: "#14B8A6", img: null },
  { id: "phones", name: "Phones", icon: "📱", color: "#6366F1", img: null },
  {
    id: "tablets",
    name: "Tablets & iPad",
    nameAr: "تابلت وأيباد",
    icon: "📱",
    color: "#9333EA",
    img: null,
  },
  { id: "power-solutions", name: "Power Solutions", icon: "🔋", color: "#CA8A04", img: null },
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
