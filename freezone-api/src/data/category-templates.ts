import type { FacetAttributeDef } from "@/lib/data";

export type CategoryTemplate = {
  id: string;
  nameAr: string;
  nameEn: string;
  attributes: FacetAttributeDef[];
};

const select = (key: string, en: string, ar: string, options: string[]): FacetAttributeDef => ({
  key,
  name_en: en,
  name_ar: ar,
  type: "SELECT",
  options,
  filterable: true,
  searchable: true,
  comparable: true,
  displayGroup: "specs",
});

const text = (key: string, en: string, ar: string): FacetAttributeDef => ({
  key,
  name_en: en,
  name_ar: ar,
  type: "TEXT",
  filterable: false,
  searchable: true,
  displayGroup: "specs",
});

export const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  {
    id: "smartphone",
    nameAr: "هواتف ذكية",
    nameEn: "Smartphone",
    attributes: [
      select("brand", "Brand", "العلامة", ["Apple", "Samsung", "Xiaomi", "Other"]),
      select("storage", "Storage", "التخزين", ["64GB", "128GB", "256GB", "512GB", "1TB"]),
      select("ram", "RAM", "الذاكرة", ["4GB", "6GB", "8GB", "12GB", "16GB"]),
      select("screen_size", "Screen", "الشاشة", ['6.1"', '6.5"', '6.7"', "Other"]),
      select("network", "Network", "الشبكة", ["4G", "5G"]),
      text("color", "Color", "اللون"),
    ],
  },
  {
    id: "laptop",
    nameAr: "حواسيب محمولة",
    nameEn: "Laptop",
    attributes: [
      select("brand", "Brand", "العلامة", ["Apple", "Dell", "HP", "Lenovo", "ASUS", "Other"]),
      select("cpu", "Processor", "المعالج", ["Intel i3", "Intel i5", "Intel i7", "Ryzen 5", "Ryzen 7", "Apple M"]),
      select("ram", "RAM", "الذاكرة", ["8GB", "16GB", "32GB", "64GB"]),
      select("storage", "Storage", "التخزين", ["256GB SSD", "512GB SSD", "1TB SSD", "2TB SSD"]),
      select("gpu", "Graphics", "كرت الشاشة", ["Integrated", "NVIDIA", "AMD"]),
      text("screen_size", "Screen", "الشاشة"),
    ],
  },
  {
    id: "tv",
    nameAr: "تلفزيونات",
    nameEn: "TV",
    attributes: [
      select("brand", "Brand", "العلامة", ["Samsung", "LG", "Sony", "TCL", "Other"]),
      select("size", "Size", "المقاس", ['32"', '43"', '50"', '55"', '65"', '75"']),
      select("resolution", "Resolution", "الدقة", ["HD", "Full HD", "4K", "8K"]),
      select("panel", "Panel", "اللوحة", ["LED", "QLED", "OLED"]),
    ],
  },
  {
    id: "accessory",
    nameAr: "إكسسوارات",
    nameEn: "Accessory",
    attributes: [
      select("type", "Type", "النوع", ["Case", "Charger", "Cable", "Headphones", "Other"]),
      select("compatibility", "Compatibility", "التوافق", ["Universal", "iPhone", "Samsung", "Other"]),
      text("color", "Color", "اللون"),
    ],
  },
];

export function getCategoryTemplate(id: string): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES.find((t) => t.id === id);
}
