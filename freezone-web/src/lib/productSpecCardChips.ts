import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AudioLines,
  Battery,
  BatteryCharging,
  Bluetooth,
  Box,
  Cable,
  Calendar,
  Camera,
  CircuitBoard,
  Cpu,
  Disc,
  Eye,
  Fan,
  Film,
  Gamepad2,
  Gauge,
  Gpu,
  HardDrive,
  Headphones,
  Home,
  Keyboard,
  KeyRound,
  Laptop,
  Layers,
  Layout,
  ListChecks,
  Maximize2,
  MemoryStick,
  Mic2,
  Monitor,
  Moon,
  Mouse,
  Network,
  Package,
  Palette,
  Percent,
  Pin,
  Plug,
  Power,
  Printer,
  Aperture,
  Radio,
  ScanEye,
  Router,
  Ruler,
  Scan,
  Server,
  Shield,
  Smartphone,
  Speaker,
  SunMedium,
  Tag,
  Tablet,
  ToggleLeft,
  Tv,
  Usb,
  Users,
  Video,
  Volume2,
  Watch,
  Waves,
  Webcam,
  Weight,
  Wifi,
  Zap,
} from "lucide-react";
import type { FacetAttributeDef, Product } from "@/lib/data";
import { FACET_KEY_TO_LABEL } from "@/lib/productFacetConfig";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { getAllFacetCatalogKeysOrdered } from "@/lib/facet-admin-labels";

const FACET_ORDER = getAllFacetCatalogKeysOrdered();

/** When key/value does not map to a known facet icon, use this only if no keyword matches. */
const FALLBACK_SPEC_ICON = Package;

/**
 * Infer icon from free-form `specs` keys and values (e.g. `deviceType: Keyboard`).
 * Uses English + a few Arabic hints; avoids generic tag shapes.
 */
export function pickSemanticSpecIcon(specKey: string, value: string): LucideIcon {
  const k = specKey.toLowerCase().replace(/_/g, "");
  const v = value.toLowerCase();
  const h = `${k} ${v}`;

  if (
    /(device|product|item)type$|^type$|category$|class$|kind$/i.test(specKey) ||
    /^(subtype|variant|style)$/i.test(specKey)
  ) {
    if (
      /\b(mechanical|membrane|cherry|mx\b|opx|optical\s*switch|full[-\s]?size)\b/i.test(v) &&
      !/\b(laptop|notebook|mouse|headphone|printer|camera|monitor)\b/i.test(v)
    ) {
      return Keyboard;
    }
  }

  const rules: Array<{ test: RegExp; icon: LucideIcon }> = [
    { test: /\bkeyboard\b|كيبورد|⌨/i, icon: Keyboard },
    { test: /\b(mouse|mice|trackball)\b|فأرة|ماوس/i, icon: Mouse },
    { test: /\b(headset|headphone|earbud|earphone)\b|سماعة|سماعات/i, icon: Headphones },
    { test: /\b(speaker|subwoofer|soundbar)\b|سماعة أرضية/i, icon: Speaker },
    { test: /\b(microphone|mic\b|ميكروفون)/i, icon: Mic2 },
    { test: /\b(webcam)\b/i, icon: Webcam },
    { test: /\b(monitor|display\b|screen\b|ultrawide|qhd|uhd|4k|1440p|1080p)\b|شاشة/i, icon: Monitor },
    { test: /\b(tv\b|television|oled tv)\b|تلفزيون/i, icon: Tv },
    { test: /\b(laptop|notebook|macbook)\b|لابتوب|حاسوب محمول/i, icon: Laptop },
    { test: /\b(tablet|ipad)\b|تابلت/i, icon: Tablet },
    { test: /\b(phone|smartphone|iphone|android phone|mobile)\b|هاتف|جوال/i, icon: Smartphone },
    { test: /\b(watch|smartwatch|wearable)\b|ساعة ذكية/i, icon: Watch },
    { test: /\b(gamepad|controller|joystick|playstation|xbox)\b|يد تحكم/i, icon: Gamepad2 },
    { test: /\b(printer|scanner|toner|inkjet|laser print)\b|طابعة|ماسح/i, icon: Printer },
    { test: /\b(camera|cctv|ip cam|lens|nvr|dvr)\b|كاميرا|مراقبة/i, icon: Camera },
    { test: /\b(router|mesh|access point|ap\b|gateway)\b|راوتر/i, icon: Router },
    { test: /\b(switch\b|hub\b|rj45|ethernet patch)\b|سويتش/i, icon: Network },
    { test: /\b(usb hub|usb[-\s]?c|thunderbolt|dock)\b/i, icon: Usb },
    { test: /\b(wifi|wi[-\s]?fi|wireless lan|802\.11)\b/i, icon: Wifi },
    { test: /\bbluetooth\b|بلوتوث/i, icon: Bluetooth },
    { test: /\b(cable|adapter|charger|charging|pd\b|power brick)\b|كابل|شاحن/i, icon: Plug },
    { test: /\b(fan\b|cooler|radiator| aio\b)\b|مروحة|تبريد/i, icon: Fan },
    { test: /\b(ram|memory|ddr[45]|gb ram)\b|ذاكرة/i, icon: MemoryStick },
    { test: /\b(ssd|hdd|nvme|storage drive)\b/i, icon: HardDrive },
    { test: /\b(cpu|processor|ryzen|core i|intel|amd threadripper)\b|معالج/i, icon: Cpu },
    { test: /\b(gpu|graphics|geforce|rtx|radeon)\b/i, icon: Gpu },
    { test: /\b(battery|mah|milliamp|power bank)\b|بطارية/i, icon: Battery },
    { test: /\b(ups\b|uninterruptible)\b/i, icon: BatteryCharging },
    { test: /\b(smart home|zigbee|z[- ]?wave|matter hub|sensor count)\b|منزل ذكي/i, icon: Home },
    { test: /\b(color|finish|variant|rgb lighting)\b|لون|تشطيب/i, icon: Palette },
    { test: /\b(weight|dimension|size|mm\b|cm\b|inch)\b|وزن|أبعاد|مقاس/i, icon: Ruler },
    { test: /\b(warranty|year support)\b|ضمان/i, icon: Shield },
  ];

  for (const { test, icon } of rules) {
    if (test.test(h)) return icon;
  }

  if (/(device|product|item)type|category|class|kind/.test(k)) return Package;

  return FALLBACK_SPEC_ICON;
}

/** Lucide icon per catalog facet `specs` key — unknown keys use `pickSemanticSpecIcon`. */
export const SPEC_CARD_ICON_BY_KEY: Record<string, LucideIcon> = {
  model: Tag,
  cpu: Cpu,
  gpu: Gpu,
  ram: MemoryStick,
  vram: Gpu,
  storage: HardDrive,
  storageType: HardDrive,
  screenSize: Monitor,
  refreshRate: Gauge,
  resolution: Maximize2,
  panelType: Layers,
  touchscreen: Smartphone,
  os: Disc,
  mbFormFactor: CircuitBoard,
  socketType: Cpu,
  psuWattage: Zap,
  paperType: Printer,
  printColor: Printer,
  printTechnology: Printer,
  printSpeedPpm: Gauge,
  duplexPrinting: Printer,
  scanResolution: Scan,
  connectivityPrinter: Usb,
  cameraColorMode: Camera,
  viewingAngleDeg: Eye,
  nightVisionMeters: Moon,
  ipRating: Shield,
  lensType: Camera,
  poeSupport: Plug,
  recordingResolution: Film,
  imagingQuality: Film,
  lensFocalMm: Aperture,
  hybridVideoSignals: Radio,
  imageSensor: CircuitBoard,
  smartDetection: ScanEye,
  smartProtocol: Radio,
  switchCount: ToggleLeft,
  sensorCount: Activity,
  voiceAssistantCompat: Mic2,
  smartHubMaxDevices: Home,
  panelWattPeakW: SunMedium,
  solarCellType: SunMedium,
  batteryCapacityKwh: Battery,
  batteryCapacityAh: Battery,
  inverterType: Waves,
  nominalVoltageV: Zap,
  phaseCount: Power,
  upsVA: BatteryCharging,
  pureSineWave: Waves,
  outletsCount: Plug,
  usbPortsPower: Usb,
  efficiencyPercent: Percent,
  licenseType: KeyRound,
  seatCount: Users,
  softwarePlatform: Layout,
  subscriptionTerm: Calendar,
  sizeLabel: Ruler,
  dimensionsMm: Maximize2,
  weightKg: Weight,
  cableLengthM: Cable,
  colorVariant: Palette,
  material: Box,
  compatibilityList: ListChecks,
  mountingType: Pin,
  wattage: Zap,
  maxCurrentA: Zap,
  cableGauge: Cable,
  portCount: Network,
  wifiStandard: Wifi,
  maxSpeedMbps: Gauge,
  audioDriverSize: Volume2,
  impedanceOhms: AudioLines,
  batteryLifeHours: Battery,
  componentType: Package,
  systemType: Server,
  channelCount: Video,
};

export type SpecCardChip = {
  specKey: string;
  Icon: LucideIcon;
  /** Short line for the pill (value-first when a known facet icon applies). */
  label: string;
};

function isEmptySpecValue(raw: string): boolean {
  const s = raw.trim().toLowerCase();
  return !s || s === "n/a" || s === "na" || s === "—" || s === "-" || s === "none";
}

function humanizeSpecKey(key: string): string {
  const spaced = key.replace(/([A-Z])/g, " $1").trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(0, max - 1))}…`;
}

function sortSpecKeys(keys: string[], facetAttributes?: import("@/lib/data").FacetAttributeDef[]): string[] {
  if (facetAttributes?.length) {
    const order = new Map(facetAttributes.map((a, i) => [a.key, i]));
    return [...keys].sort(
      (a, b) => (order.get(a) ?? 9999) - (order.get(b) ?? 9999) || a.localeCompare(b),
    );
  }
  const rank = (k: string) => {
    const i = FACET_ORDER.indexOf(k);
    return i === -1 ? FACET_ORDER.length + 1 : i;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

export type ProductSpecAttributeRow = { specKey: string; label: string; value: string };

/**
 * Full spec rows for product detail table (no truncation).
 * @param translateFacet — `useTranslations("Products")` for `FACET_KEY_TO_LABEL` keys.
 */
export function buildProductSpecAttributeRows(
  product: Product,
  translateFacetLabel: (labelKey: string) => string,
  options?: { omitSpecKeys?: readonly string[]; facetAttributes?: FacetAttributeDef[]; locale?: "en" | "ar" },
): ProductSpecAttributeRow[] {
  const specs = product.specs ?? {};
  const facetAttrs = options?.facetAttributes ?? [];
  if (!Object.keys(specs).length && !facetAttrs.length) return [];

  const omit = new Set(options?.omitSpecKeys ?? []);
  const attrByKey = new Map(facetAttrs.map((a) => [a.key, a]));
  const loc = options?.locale ?? "en";

  const keysWithValues = new Set<string>();
  if (facetAttrs.length) {
    for (const a of facetAttrs) {
      if (omit.has(a.key)) continue;
      const v = specs[a.key];
      if (v != null && !isEmptySpecValue(String(v))) keysWithValues.add(a.key);
    }
  }
  for (const [k, v] of Object.entries(specs)) {
    if (omit.has(k) || isEmptySpecValue(String(v))) continue;
    keysWithValues.add(k);
  }
  if (keysWithValues.size === 0) return [];

  const ordered = sortSpecKeys([...keysWithValues], facetAttrs.length ? facetAttrs : undefined);
  const entryByKey = new Map(Object.entries(specs));
  const rows: ProductSpecAttributeRow[] = [];

  for (const key of ordered) {
    const rawVal = entryByKey.get(key);
    if (rawVal == null) continue;
    const val = String(rawVal).trim();
    if (isEmptySpecValue(val)) continue;

    const custom = attrByKey.get(key);
    const labelKey = FACET_KEY_TO_LABEL[key];
    let label: string;
    if (custom && (custom.name_en?.trim() || custom.name_ar?.trim())) {
      label = facetAttributeDisplayName(custom, loc);
    } else if (labelKey) {
      label = translateFacetLabel(labelKey);
    } else {
      label = humanizeSpecKey(key);
    }
    rows.push({ specKey: key, label, value: val });
  }

  return rows;
}

/**
 * Build attribute chips for the product card from `product.specs`.
 * @param translateFacet — `useTranslations("Products")` bound to facet label keys (e.g. `facetCpu`).
 */
export function buildProductSpecChips(
  product: Product,
  translateFacet: (labelKey: string) => string,
  options?: { max?: number; facetAttributes?: FacetAttributeDef[]; locale?: "en" | "ar" },
): SpecCardChip[] {
  const max = options?.max ?? 5;
  if (!product.specs) return [];

  const attrByKey = new Map((options?.facetAttributes ?? []).map((a) => [a.key, a]));
  const loc = options?.locale ?? "en";

  const entries = Object.entries(product.specs).filter(([, v]) => !isEmptySpecValue(String(v)));
  if (entries.length === 0) return [];

  const ordered = sortSpecKeys(entries.map(([k]) => k));
  const entryByKey = new Map(entries);

  const chips: SpecCardChip[] = [];
  for (const key of ordered) {
    if (chips.length >= max) break;
    const rawVal = entryByKey.get(key);
    if (rawVal == null) continue;
    const val = String(rawVal).trim();
    if (isEmptySpecValue(val)) continue;

    const Icon = SPEC_CARD_ICON_BY_KEY[key] ?? pickSemanticSpecIcon(key, val);
    const custom = attrByKey.get(key);
    const labelKey = FACET_KEY_TO_LABEL[key];
    const facetTitle =
      custom && (custom.name_en?.trim() || custom.name_ar?.trim())
        ? facetAttributeDisplayName(custom, loc)
        : labelKey
          ? translateFacet(labelKey)
          : "";
    const hasNamedIcon = Object.prototype.hasOwnProperty.call(SPEC_CARD_ICON_BY_KEY, key);

    let label: string;
    if (hasNamedIcon) {
      label = truncate(val, 42);
    } else if (facetTitle) {
      label = truncate(`${facetTitle}: ${val}`, 48);
    } else {
      label = truncate(`${humanizeSpecKey(key)}: ${val}`, 48);
    }

    chips.push({ specKey: key, Icon, label });
  }

  return chips;
}
