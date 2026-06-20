/**
 * Normalization utilities — brand / category / spec name+value, category
 * inference, slugify. Pure and deterministic so imports are reproducible.
 */

const BRAND_ALIASES: Record<string, string> = {
  hp: "HP",
  "hewlett packard": "HP",
  "hewlett-packard": "HP",
  asus: "ASUS",
  msi: "MSI",
  lenovo: "Lenovo",
  dell: "Dell",
  acer: "Acer",
  apple: "Apple",
  hikvision: "Hikvision",
  dahua: "Dahua",
  "tp-link": "TP-Link",
  tplink: "TP-Link",
  "tp link": "TP-Link",
  ubiquiti: "Ubiquiti",
  cisco: "Cisco",
  samsung: "Samsung",
  lg: "LG",
  logitech: "Logitech",
  razer: "Razer",
  corsair: "Corsair",
  epson: "Epson",
  canon: "Canon",
  brother: "Brother",
  xiaomi: "Xiaomi",
  tuya: "Tuya",
  gigabyte: "Gigabyte",
  intel: "Intel",
  amd: "AMD",
  nvidia: "NVIDIA",
};

export function normalizeBrand(raw: string): string {
  const t = (raw || "").trim().replace(/\s+/g, " ");
  if (!t) return "";
  return BRAND_ALIASES[t.toLowerCase()] ?? t;
}

const CATEGORY_ALIASES: Record<string, string> = {
  cctv: "cctv",
  camera: "cctv",
  cameras: "cctv",
  surveillance: "cctv",
  security: "security",
  alarm: "security",
  "access control": "security",
  laptop: "laptops",
  laptops: "laptops",
  notebook: "laptops",
  computer: "computers",
  computers: "computers",
  desktop: "computers",
  pc: "computers",
  gaming: "gaming",
  console: "gaming",
  monitor: "monitors",
  monitors: "monitors",
  display: "monitors",
  printer: "printers",
  printers: "printers",
  network: "networking",
  networking: "networking",
  router: "networking",
  "smart home": "smart-home",
  "smart-home": "smart-home",
  smarthome: "smart-home",
  accessory: "accessories",
  accessories: "accessories",
  component: "components",
  components: "components",
  power: "power-solutions",
  ups: "power-solutions",
  "power-solutions": "power-solutions",
  solar: "power-solutions",
  phone: "phones",
  phones: "phones",
  mobile: "phones",
  tablet: "tablets",
  tablets: "tablets",
  "all-in-one": "all-in-one",
  aio: "all-in-one",
  electric: "electric",
};

const KNOWN_CATEGORY_SLUGS = new Set<string>(Object.values(CATEGORY_ALIASES));

export function slugify(s: string): string {
  return (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function normalizeCategory(raw: string): string {
  const t = (raw || "").trim().toLowerCase();
  if (!t) return "";
  return CATEGORY_ALIASES[t] ?? slugify(t);
}

export function isKnownCategory(slug: string): boolean {
  return KNOWN_CATEGORY_SLUGS.has(slug);
}

export function inferCategoryFromTitle(title: string): string | null {
  const t = (title || "").toLowerCase();
  const rules: [RegExp, string][] = [
    [/\b(cctv|camera|ip ?cam|dvr|nvr|surveillance)\b|كاميرا|مراقبة/, "cctv"],
    [/\b(alarm|access control|motion sensor)\b|إنذار/, "security"],
    [/\b(laptop|notebook|macbook)\b|لابتوب/, "laptops"],
    [/\b(monitor|display)\b|شاشة/, "monitors"],
    [/\b(printer|scanner)\b|طابعة/, "printers"],
    [/\b(router|switch|access ?point|wi-?fi|mesh)\b|راوتر|شبكة/, "networking"],
    [/\b(ups|inverter|solar|battery)\b|طاقة/, "power-solutions"],
    [/\b(smart ?home|smart ?bulb|smart ?plug)\b|منزل ذكي/, "smart-home"],
    [/\b(gpu|cpu|ram|motherboard|ssd|graphics card)\b|معالج|كرت شاشة/, "components"],
    [/\b(playstation|ps5|xbox|nintendo|console)\b|ألعاب/, "gaming"],
    [/\b(desktop|all-?in-?one)\b|حاسبة|حاسوب/, "computers"],
  ];
  for (const [re, cat] of rules) if (re.test(t)) return cat;
  return null;
}

export function normalizeSpecName(raw: string): string {
  return (raw || "")
    .trim()
    .toLowerCase()
    .replace(/[\s/]+/g, "_")
    .replace(/[^\p{L}\p{N}_]/gu, "")
    .slice(0, 48);
}

export function normalizeSpecValue(raw: string): string {
  return (raw || "").toString().trim().replace(/\s+/g, " ").slice(0, 160);
}
