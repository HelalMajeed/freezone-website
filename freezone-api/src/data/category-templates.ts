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
  {
    id: "clothing",
    nameAr: "ملابس",
    nameEn: "Clothing",
    attributes: [
      select("size", "Size", "المقاس", ["XS", "S", "M", "L", "XL", "XXL"]),
      select("color", "Color", "اللون", ["أسود", "أبيض", "أزرق", "أحمر", "أخرى"]),
      select("material", "Material", "الخامة", ["قطن", "بوليستر", "صوف", "مختلط"]),
      select("gender", "Gender", "الجنس", ["رجال", "نساء", "أطفال", "للجنسين"]),
      select("fit", "Fit", "القصة", ["ضيق", "عادي", "واسع"]),
      select("season", "Season", "الموسم", ["صيف", "شتاء", "كل المواسم"]),
    ],
  },
  {
    id: "footwear",
    nameAr: "أحذية",
    nameEn: "Footwear",
    attributes: [
      select("size", "Size", "المقاس", ["36", "37", "38", "39", "40", "41", "42", "43", "44"]),
      select("color", "Color", "اللون", ["أسود", "بني", "أبيض", "أخرى"]),
      select("material", "Material", "الخامة", ["جلد", "قماش", "مطاط"]),
      select("gender", "Gender", "الجنس", ["رجال", "نساء", "أطفال"]),
      select("type", "Type", "النوع", ["رياضي", "رسمي", "كاجوال", "صندل"]),
    ],
  },
  {
    id: "food",
    nameAr: "أغذية",
    nameEn: "Food",
    attributes: [
      select("weight", "Weight", "الوزن", ["250g", "500g", "1kg"]),
      text("brand", "Brand", "العلامة"),
      select("origin", "Origin", "المنشأ", ["عراقي", "تركي", "صيني", "أخرى"]),
      text("expiry", "Expiry", "تاريخ الصلاحية"),
      select("type", "Type", "النوع", ["معلب", "مجمد", "طازج"]),
      select("halal", "Halal", "حلال", ["نعم", "لا"]),
    ],
  },
  {
    id: "cosmetics",
    nameAr: "مستحضرات تجميل",
    nameEn: "Cosmetics",
    attributes: [
      text("brand", "Brand", "العلامة"),
      select("type", "Type", "النوع", ["عناية", "مكياج", "عطر"]),
      select("skin_type", "Skin Type", "نوع البشرة", ["جافة", "دهنية", "مختلطة", "حساسة"]),
      select("volume", "Volume", "الحجم", ["50ml", "100ml", "200ml"]),
      select("origin", "Origin", "المنشأ", ["كوريا", "فرنسا", "أخرى"]),
    ],
  },
  {
    id: "books",
    nameAr: "كتب",
    nameEn: "Books",
    attributes: [
      text("author", "Author", "المؤلف"),
      text("publisher", "Publisher", "الناشر"),
      select("language", "Language", "اللغة", ["عربي", "إنجليزي", "أخرى"]),
      select("pages", "Pages", "الصفحات", ["<100", "100-300", "300+"]),
      text("isbn", "ISBN", "ISBN"),
      select("genre", "Genre", "التصنيف", ["رواية", "علمي", "ديني", "أطفال"]),
    ],
  },
  {
    id: "jewelry",
    nameAr: "مجوهرات",
    nameEn: "Jewelry",
    attributes: [
      select("material", "Material", "المادة", ["ذهب", "فضة", "ستانلس"]),
      text("weight", "Weight", "الوزن"),
      select("stone", "Stone", "الحجر", ["ألماس", "زircon", "بدون"]),
      select("karat", "Karat", "العيار", ["18K", "21K", "24K"]),
      select("style", "Style", "الطراز", ["كلاسيك", "عصري"]),
    ],
  },
  {
    id: "home-appliance",
    nameAr: "أجهزة منزلية",
    nameEn: "Home Appliance",
    attributes: [
      select("power", "Power", "القدرة", ["500W", "1000W", "1500W+"]),
      select("capacity", "Capacity", "السعة", ["صغير", "متوسط", "كبير"]),
      select("energy_rating", "Energy", "كفاءة الطاقة", ["A", "B", "C"]),
      select("warranty", "Warranty", "الضمان", ["سنة", "سنتان", "3 سنوات"]),
      text("brand", "Brand", "العلامة"),
    ],
  },
  {
    id: "automotive-parts",
    nameAr: "قطع سيارات",
    nameEn: "Automotive Parts",
    attributes: [
      select("make", "Make", "الشركة", ["Toyota", "Hyundai", "Kia", "أخرى"]),
      text("model", "Model", "الموديل"),
      text("year", "Year", "السنة"),
      text("compatibility", "Compatibility", "التوافق"),
      select("oem", "OEM", "OEM/بديل", ["OEM", "Aftermarket"]),
    ],
  },
];

export function getCategoryTemplate(id: string): CategoryTemplate | undefined {
  return CATEGORY_TEMPLATES.find((t) => t.id === id);
}
