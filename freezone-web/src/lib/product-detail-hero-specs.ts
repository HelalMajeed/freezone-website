import type { ProductDetailSpecGroup } from "@/lib/product-detail";

export type HeroSpecLine = { label: string; value: string };

const HERO_KEYS: { keys: string[]; labelEn: string; labelAr: string }[] = [
  { keys: ["processor_full", "cpu"], labelEn: "CPU", labelAr: "المعالج" },
  { keys: ["ram_display", "ram"], labelEn: "RAM", labelAr: "الرام" },
  { keys: ["storage_display", "storage"], labelEn: "Storage", labelAr: "التخزين" },
  { keys: ["gpu_full", "gpu"], labelEn: "GPU", labelAr: "كرت الشاشة" },
  { keys: ["display_full", "screen_size", "screen"], labelEn: "Display", labelAr: "الشاشة" },
  { keys: ["webcam"], labelEn: "Webcam", labelAr: "الكاميرا" },
  { keys: ["io_ports", "ports"], labelEn: "I/O Ports", labelAr: "المنافذ" },
  { keys: ["battery", "battery_wh"], labelEn: "Battery", labelAr: "البطارية" },
  { keys: ["warranty"], labelEn: "Warranty", labelAr: "الضمان" },
];

function findInGroups(groups: ProductDetailSpecGroup[], keys: string[]): string | undefined {
  for (const g of groups) {
    for (const item of g.items) {
      if (keys.includes(item.key) && item.value?.trim()) {
        return item.value.trim();
      }
    }
  }
  return undefined;
}

export function buildProductHeroSpecLines(
  groupedSpecs: ProductDetailSpecGroup[],
  locale: "en" | "ar",
): HeroSpecLine[] {
  const out: HeroSpecLine[] = [];
  for (const row of HERO_KEYS) {
    const value = findInGroups(groupedSpecs, row.keys);
    if (!value) continue;
    out.push({
      label: locale === "ar" ? row.labelAr : row.labelEn,
      value,
    });
  }
  return out;
}
