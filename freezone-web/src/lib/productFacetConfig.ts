import type { AttributeType, FacetAttributeDef, Product } from "./data";
import { productBelongsToCategory } from "./productCategoryMembership";
import { productValueMatchesFilterSelection } from "@/lib/classification/product-filter";
import { fuzzySelectFilterMatch, FUZZY_SELECT_FILTER_KEYS } from "@/lib/classification/legacy-spec-map";
import { getProductFilterToken } from "@/lib/classification/facet-filter-token";

export type FacetDefinition = {
  key: string;
  labelKey: string;
  /** When set (from `Category.facetAttributes`), overrides i18n for this facet. */
  name_en?: string;
  name_ar?: string;
  type?: AttributeType;
  filterable?: boolean;
  unit?: string;
  options?: string[];
};

/** Title for filters / PDP — uses DB names when present, else `Products.*` i18n. */
export function facetDefinitionDisplayTitle(
  def: FacetDefinition,
  locale: "en" | "ar",
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const en = def.name_en?.trim() ?? "";
  const ar = def.name_ar?.trim() ?? "";
  if (en || ar) {
    const primary = locale === "ar" ? ar : en;
    const fallback = locale === "ar" ? en : ar;
    return primary || fallback || def.key;
  }
  return def.labelKey === "facetGeneric" ? t("facetGeneric", { key: def.key }) : t(def.labelKey);
}

/** Maps spec key → Products.* translation key (fallback: show raw `key` in UI when missing). */
export const FACET_KEY_TO_LABEL: Record<string, string> = {
  model: "facetModel",
  screen: "facetScreen",
  cpu: "facetCpu",
  gpu: "facetGpu",
  ram: "facetRam",
  storage: "facetStorage",
  storageType: "facetStorageType",
  screenSize: "facetScreenSize",
  refreshRate: "facetRefreshRate",
  resolution: "facetResolution",
  panelType: "facetPanelType",
  componentType: "facetComponentType",
  systemType: "facetSystemType",
  channelCount: "facetChannelCount",
  vram: "facetVram",
  touchscreen: "facetTouchscreen",
  os: "facetOs",
  mbFormFactor: "facetMbFormFactor",
  socketType: "facetSocketType",
  psuWattage: "facetPsuWattage",
  paperType: "facetPaperType",
  printColor: "facetPrintColor",
  printTechnology: "facetPrintTechnology",
  printSpeedPpm: "facetPrintSpeedPpm",
  duplexPrinting: "facetDuplexPrinting",
  scanResolution: "facetScanResolution",
  connectivityPrinter: "facetConnectivityPrinter",
  cameraColorMode: "facetCameraColorMode",
  viewingAngleDeg: "facetViewingAngleDeg",
  nightVisionMeters: "facetNightVisionMeters",
  ipRating: "facetIpRating",
  lensType: "facetLensType",
  poeSupport: "facetPoeSupport",
  recordingResolution: "facetRecordingResolution",
  imagingQuality: "facetImagingQuality",
  lensFocalMm: "facetLensFocalMm",
  hybridVideoSignals: "facetHybridVideoSignals",
  imageSensor: "facetImageSensor",
  smartDetection: "facetSmartDetection",
  smartProtocol: "facetSmartProtocol",
  switchCount: "facetSwitchCount",
  sensorCount: "facetSensorCount",
  voiceAssistantCompat: "facetVoiceAssistantCompat",
  smartHubMaxDevices: "facetSmartHubMaxDevices",
  panelWattPeakW: "facetPanelWattPeakW",
  solarCellType: "facetSolarCellType",
  batteryCapacityKwh: "facetBatteryCapacityKwh",
  batteryCapacityAh: "facetBatteryCapacityAh",
  inverterType: "facetInverterType",
  nominalVoltageV: "facetNominalVoltageV",
  phaseCount: "facetPhaseCount",
  upsVA: "facetUpsVa",
  pureSineWave: "facetPureSineWave",
  outletsCount: "facetOutletsCount",
  usbPortsPower: "facetUsbPortsPower",
  efficiencyPercent: "facetEfficiencyPercent",
  licenseType: "facetLicenseType",
  seatCount: "facetSeatCount",
  softwarePlatform: "facetSoftwarePlatform",
  subscriptionTerm: "facetSubscriptionTerm",
  sizeLabel: "facetSizeLabel",
  dimensionsMm: "facetDimensionsMm",
  weightKg: "facetWeightKg",
  cableLengthM: "facetCableLengthM",
  colorVariant: "facetColorVariant",
  material: "facetMaterial",
  compatibilityList: "facetCompatibilityList",
  mountingType: "facetMountingType",
  wattage: "facetWattage",
  maxCurrentA: "facetMaxCurrentA",
  cableGauge: "facetCableGauge",
  portCount: "facetPortCount",
  wifiStandard: "facetWifiStandard",
  maxSpeedMbps: "facetMaxSpeedMbps",
  audioDriverSize: "facetAudioDriverSize",
  impedanceOhms: "facetImpedanceOhms",
  batteryLifeHours: "facetBatteryLifeHours",
  /** Tablets / iPad */
  biometricAuth: "facetBiometricAuth",
  bluetoothVersion: "facetBluetoothVersion",
  cameraFront: "facetCameraFront",
  cameraRear: "facetCameraRear",
  cellularNetwork: "facetCellularNetwork",
  chargingPowerW: "facetChargingPowerW",
  connectorType: "facetConnectorType",
  displayFeatures: "facetDisplayFeatures",
  keyboardAccessory: "facetKeyboardAccessory",
  stylusSupport: "facetStylusSupport",
  batteryCapacityMah: "facetBatteryCapacityMah",
  speakerConfig: "facetSpeakerConfig",
};

/** Facet keys and i18n label keys per category (`cat` from product / URL). */
export const CATEGORY_FACETS: Record<string, FacetDefinition[]> = {
  gaming: [
    { key: "cpu", labelKey: "facetCpu" },
    { key: "gpu", labelKey: "facetGpu" },
    { key: "ram", labelKey: "facetRam" },
  ],
  computers: [
    { key: "cpu", labelKey: "facetCpu" },
    { key: "ram", labelKey: "facetRam" },
    { key: "storageType", labelKey: "facetStorageType" },
  ],
  laptops: [
    { key: "cpu", labelKey: "facetCpu" },
    { key: "ram", labelKey: "facetRam" },
    { key: "storageType", labelKey: "facetStorageType" },
    { key: "screenSize", labelKey: "facetScreenSize" },
    { key: "gpu", labelKey: "facetGpu" },
  ],
  monitors: [
    { key: "screenSize", labelKey: "facetScreenSize" },
    { key: "refreshRate", labelKey: "facetRefreshRate" },
    { key: "resolution", labelKey: "facetResolution" },
    { key: "panelType", labelKey: "facetPanelType" },
  ],
  components: [
    { key: "componentType", labelKey: "facetComponentType" },
    { key: "cpu", labelKey: "facetCpu" },
    { key: "gpu", labelKey: "facetGpu" },
    { key: "ram", labelKey: "facetRam" },
    { key: "socketType", labelKey: "facetSocketType" },
    { key: "psuWattage", labelKey: "facetPsuWattage" },
  ],
  security: [
    { key: "systemType", labelKey: "facetSystemType" },
    { key: "channelCount", labelKey: "facetChannelCount" },
  ],
  cctv: [
    { key: "imagingQuality", labelKey: "facetImagingQuality" },
    { key: "resolution", labelKey: "facetResolution" },
    { key: "recordingResolution", labelKey: "facetRecordingResolution" },
    { key: "lensFocalMm", labelKey: "facetLensFocalMm" },
    { key: "lensType", labelKey: "facetLensType" },
    { key: "nightVisionMeters", labelKey: "facetNightVisionMeters" },
    { key: "hybridVideoSignals", labelKey: "facetHybridVideoSignals" },
    { key: "ipRating", labelKey: "facetIpRating" },
    { key: "imageSensor", labelKey: "facetImageSensor" },
    { key: "smartDetection", labelKey: "facetSmartDetection" },
    { key: "cameraColorMode", labelKey: "facetCameraColorMode" },
    { key: "viewingAngleDeg", labelKey: "facetViewingAngleDeg" },
    { key: "poeSupport", labelKey: "facetPoeSupport" },
    { key: "channelCount", labelKey: "facetChannelCount" },
  ],
  "all-in-one": [
    { key: "cpu", labelKey: "facetCpu" },
    { key: "ram", labelKey: "facetRam" },
    { key: "storageType", labelKey: "facetStorageType" },
    { key: "screenSize", labelKey: "facetScreenSize" },
  ],
  "smart-home": [
    { key: "smartProtocol", labelKey: "facetSmartProtocol" },
    { key: "systemType", labelKey: "facetSystemType" },
    { key: "switchCount", labelKey: "facetSwitchCount" },
    { key: "sensorCount", labelKey: "facetSensorCount" },
    { key: "voiceAssistantCompat", labelKey: "facetVoiceAssistantCompat" },
    { key: "smartHubMaxDevices", labelKey: "facetSmartHubMaxDevices" },
    { key: "wifiStandard", labelKey: "facetWifiStandard" },
  ],
  accessories: [
    { key: "sizeLabel", labelKey: "facetSizeLabel" },
    { key: "dimensionsMm", labelKey: "facetDimensionsMm" },
    { key: "weightKg", labelKey: "facetWeightKg" },
    { key: "cableLengthM", labelKey: "facetCableLengthM" },
    { key: "colorVariant", labelKey: "facetColorVariant" },
    { key: "material", labelKey: "facetMaterial" },
    { key: "compatibilityList", labelKey: "facetCompatibilityList" },
    { key: "mountingType", labelKey: "facetMountingType" },
    { key: "componentType", labelKey: "facetComponentType" },
  ],
  phones: [
    { key: "ram", labelKey: "facetRam" },
    { key: "storageType", labelKey: "facetStorageType" },
    { key: "os", labelKey: "facetOs" },
    { key: "screenSize", labelKey: "facetScreenSize" },
  ],
  tablets: [
    { key: "model", labelKey: "facetModel" },
    { key: "cpu", labelKey: "facetCpu" },
    { key: "gpu", labelKey: "facetGpu" },
    { key: "ram", labelKey: "facetRam" },
    { key: "vram", labelKey: "facetVram" },
    { key: "storage", labelKey: "facetStorage" },
    { key: "storageType", labelKey: "facetStorageType" },
    { key: "os", labelKey: "facetOs" },
    { key: "screenSize", labelKey: "facetScreenSize" },
    { key: "resolution", labelKey: "facetResolution" },
    { key: "refreshRate", labelKey: "facetRefreshRate" },
    { key: "panelType", labelKey: "facetPanelType" },
    { key: "touchscreen", labelKey: "facetTouchscreen" },
    { key: "displayFeatures", labelKey: "facetDisplayFeatures" },
    { key: "biometricAuth", labelKey: "facetBiometricAuth" },
    { key: "cameraFront", labelKey: "facetCameraFront" },
    { key: "cameraRear", labelKey: "facetCameraRear" },
    { key: "stylusSupport", labelKey: "facetStylusSupport" },
    { key: "keyboardAccessory", labelKey: "facetKeyboardAccessory" },
    { key: "cellularNetwork", labelKey: "facetCellularNetwork" },
    { key: "wifiStandard", labelKey: "facetWifiStandard" },
    { key: "bluetoothVersion", labelKey: "facetBluetoothVersion" },
    { key: "maxSpeedMbps", labelKey: "facetMaxSpeedMbps" },
    { key: "connectorType", labelKey: "facetConnectorType" },
    { key: "portCount", labelKey: "facetPortCount" },
    { key: "usbPortsPower", labelKey: "facetUsbPortsPower" },
    { key: "batteryCapacityMah", labelKey: "facetBatteryCapacityMah" },
    { key: "batteryLifeHours", labelKey: "facetBatteryLifeHours" },
    { key: "chargingPowerW", labelKey: "facetChargingPowerW" },
    { key: "speakerConfig", labelKey: "facetSpeakerConfig" },
    { key: "voiceAssistantCompat", labelKey: "facetVoiceAssistantCompat" },
    { key: "weightKg", labelKey: "facetWeightKg" },
    { key: "dimensionsMm", labelKey: "facetDimensionsMm" },
    { key: "ipRating", labelKey: "facetIpRating" },
    { key: "material", labelKey: "facetMaterial" },
    { key: "colorVariant", labelKey: "facetColorVariant" },
    { key: "compatibilityList", labelKey: "facetCompatibilityList" },
  ],
  printers: [
    { key: "paperType", labelKey: "facetPaperType" },
    { key: "printColor", labelKey: "facetPrintColor" },
    { key: "printTechnology", labelKey: "facetPrintTechnology" },
    { key: "printSpeedPpm", labelKey: "facetPrintSpeedPpm" },
    { key: "duplexPrinting", labelKey: "facetDuplexPrinting" },
    { key: "scanResolution", labelKey: "facetScanResolution" },
    { key: "connectivityPrinter", labelKey: "facetConnectivityPrinter" },
    { key: "resolution", labelKey: "facetResolution" },
  ],
  software: [
    { key: "licenseType", labelKey: "facetLicenseType" },
    { key: "seatCount", labelKey: "facetSeatCount" },
    { key: "softwarePlatform", labelKey: "facetSoftwarePlatform" },
    { key: "subscriptionTerm", labelKey: "facetSubscriptionTerm" },
    { key: "os", labelKey: "facetOs" },
  ],
  "power-solutions": [
    { key: "panelWattPeakW", labelKey: "facetPanelWattPeakW" },
    { key: "solarCellType", labelKey: "facetSolarCellType" },
    { key: "batteryCapacityKwh", labelKey: "facetBatteryCapacityKwh" },
    { key: "batteryCapacityAh", labelKey: "facetBatteryCapacityAh" },
    { key: "inverterType", labelKey: "facetInverterType" },
    { key: "nominalVoltageV", labelKey: "facetNominalVoltageV" },
    { key: "phaseCount", labelKey: "facetPhaseCount" },
    { key: "upsVA", labelKey: "facetUpsVa" },
    { key: "pureSineWave", labelKey: "facetPureSineWave" },
    { key: "outletsCount", labelKey: "facetOutletsCount" },
    { key: "usbPortsPower", labelKey: "facetUsbPortsPower" },
    { key: "efficiencyPercent", labelKey: "facetEfficiencyPercent" },
    { key: "wattage", labelKey: "facetWattage" },
    { key: "maxCurrentA", labelKey: "facetMaxCurrentA" },
  ],
  electric: [
    { key: "wattage", labelKey: "facetWattage" },
    { key: "nominalVoltageV", labelKey: "facetNominalVoltageV" },
    { key: "maxCurrentA", labelKey: "facetMaxCurrentA" },
    { key: "cableGauge", labelKey: "facetCableGauge" },
    { key: "ipRating", labelKey: "facetIpRating" },
  ],
  hardware: [
    { key: "portCount", labelKey: "facetPortCount" },
    { key: "wifiStandard", labelKey: "facetWifiStandard" },
    { key: "maxSpeedMbps", labelKey: "facetMaxSpeedMbps" },
    { key: "componentType", labelKey: "facetComponentType" },
  ],
};

/** Map alternate category slugs to the canonical `CATEGORY_FACETS` entry (admin + storefront). */
const CATEGORY_FACET_SLUG_ALIASES: Record<string, string> = {
  ipad: "tablets",
  tablet: "tablets",
  "tablets-ipad": "tablets",
  "tablets-ipads": "tablets",
};

export function resolveCatalogFacetSlug(catId: string): string {
  const k = catId.trim().toLowerCase();
  return CATEGORY_FACET_SLUG_ALIASES[k] ?? k;
}

const STORAGE_TO_COMPONENT: Record<string, string> = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  mb: "Motherboard",
  storage: "SSD / Storage",
  psu: "PSU",
  case: "Case",
  cooling: "Cooling",
  monitor: "Monitor",
  desk: "Desk",
  headphones: "Headset",
  mouse: "Mouse",
  keyboard: "Keyboard",
  chair: "Chair",
  NVMe: "Other",
  "N/A": "Other",
};

/**
 * Visible sidebar filters only (`filterable === true`). Extended specs never appear here.
 * @param dynamic من `Category.facetAttributes` — يُصفّى إلى الفلاتر فقط.
 */
export function facetDefinitionsForCategory(
  catId: string,
  dynamic?: string[] | FacetAttributeDef[] | null,
): FacetDefinition[] {
  if (!catId) return [];
  if (dynamic?.length) {
    const first = dynamic[0];
    if (typeof first === "string") {
      return (dynamic as string[]).map((key) => ({
        key,
        labelKey: FACET_KEY_TO_LABEL[key] ?? "facetGeneric",
        filterable: true,
      }));
    }
    return (dynamic as FacetAttributeDef[])
      .filter((a) => a.filterable === true)
      .map((a) => ({
        key: a.key,
        labelKey: FACET_KEY_TO_LABEL[a.key] ?? "facetGeneric",
        name_en: a.name_en,
        name_ar: a.name_ar,
        type: a.type,
        filterable: a.filterable ?? true,
        unit: a.unit,
        options: a.options,
      }));
  }
  return [];
}

export function getProductFacetValue(product: Product, facetKey: string): string | undefined {
  const fromFilter = getProductFilterToken(product, facetKey);
  if (fromFilter) return fromFilter;

  if (facetKey === "componentType" && productBelongsToCategory(product, "components")) {
    const raw = product.storage?.toLowerCase() ?? "";
    return STORAGE_TO_COMPONENT[raw] ?? product.storage;
  }

  return undefined;
}

export function collectFacetValues(products: Product[], catId: string, facetKey: string): string[] {
  return collectFacetValueCounts(products, catId, facetKey).map((x) => x.value);
}

/** قيم فريدة مع عدد المنتجات لكل قيمة (مثل واجهات المتاجر: 16GB 35) */
export function collectFacetValueCounts(
  products: Product[],
  catId: string,
  facetKey: string,
): { value: string; count: number }[] {
  const pool = catId ? products.filter((p) => productBelongsToCategory(p, catId)) : products;
  const map = new Map<string, number>();
  for (const p of pool) {
    const v = getProductFacetValue(p, facetKey);
    if (v) map.set(v, (map.get(v) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
}

export function collectBrandCounts(products: Product[], catId: string): { value: string; count: number }[] {
  const pool = catId ? products.filter((p) => productBelongsToCategory(p, catId)) : products;
  const map = new Map<string, number>();
  for (const p of pool) {
    map.set(p.brand, (map.get(p.brand) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value));
}

export function productMatchesFacetSelections(
  product: Product,
  catId: string,
  selections: Record<string, string[]>,
  dynamicFacetKeys?: string[] | FacetAttributeDef[] | null,
): boolean {
  const defs = facetDefinitionsForCategory(catId, dynamicFacetKeys);
  for (const def of defs) {
    const selected = selections[def.key];
    if (!selected?.length) continue;
    const val = getProductFacetValue(product, def.key);
    const type = def.type ?? "SELECT";
    const matches =
      (type === "SELECT" || type === "TEXT") && FUZZY_SELECT_FILTER_KEYS.has(def.key)
        ? fuzzySelectFilterMatch(def.key, val, selected)
        : productValueMatchesFilterSelection(val, type, selected);
    if (!matches) return false;
  }
  return true;
}

/** Visible filter facets only (extended specs with `filterable: false` stay on PDP). */
export function filterableFacetDefinitions(defs: FacetDefinition[]): FacetDefinition[] {
  return defs.filter((d) => d.filterable === true);
}
