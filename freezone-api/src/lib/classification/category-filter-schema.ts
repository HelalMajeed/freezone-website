import type { FacetAttributeDef } from "@/lib/data";
import type { AttributeType } from "./types";
import { DEFAULT_FILTER_TO_DISPLAY_KEY } from "./filter-display-link";

type PresetAttr = {
  key: string;
  name_en: string;
  name_ar: string;
  type: AttributeType;
  filterable?: boolean;
  searchable?: boolean;
  comparable?: boolean;
  required?: boolean;
  unit?: string;
  displayGroup?: string;
  options?: string[];
  displaySpecKey?: string;
  displaySpecNameEn?: string;
  displaySpecNameAr?: string;
  displaySpecGroup?: string;
  displaySpecRequired?: boolean;
  linkDisplaySpec?: boolean;
  sortOrder?: number;
};

function attr(p: PresetAttr): FacetAttributeDef {
  const filterable = p.filterable === true;
  const inferredDisplayKey =
    p.displaySpecKey ?? (filterable ? DEFAULT_FILTER_TO_DISPLAY_KEY[p.key] : undefined);
  const linkDisplaySpec =
    p.linkDisplaySpec ?? (filterable && Boolean(inferredDisplayKey));
  return {
    key: p.key,
    name_en: p.name_en,
    name_ar: p.name_ar,
    type: p.type,
    filterable,
    searchable: p.searchable ?? false,
    comparable: p.comparable ?? false,
    required: p.required ?? false,
    unit: p.unit,
    displayGroup: p.displayGroup ?? "specs",
    options: p.options,
    displaySpecKey: inferredDisplayKey,
    displaySpecNameEn: p.displaySpecNameEn,
    displaySpecNameAr: p.displaySpecNameAr,
    displaySpecGroup: p.displaySpecGroup ?? p.displayGroup,
    displaySpecRequired: p.displaySpecRequired ?? false,
    linkDisplaySpec,
  };
}

function flt(p: Omit<PresetAttr, "filterable">): FacetAttributeDef {
  return attr({ ...p, filterable: true });
}

function ext(p: Omit<PresetAttr, "filterable">): FacetAttributeDef {
  return attr({ ...p, filterable: false });
}

function brandFilter(): FacetAttributeDef {
  return flt({
    key: "brand",
    name_en: "Brand",
    name_ar: "الماركة",
    type: "SELECT",
    searchable: true,
    displayGroup: "identity",
  });
}

function productTypeFilter(options: string[]): FacetAttributeDef {
  return flt({
    key: "product_type",
    name_en: "Product type",
    name_ar: "نوع المنتج",
    type: "SELECT",
    displayGroup: "identity",
    options,
  });
}

const DISPLAY_FULL = {
  displaySpecKey: "display_full",
  displaySpecNameEn: "Display (full)",
  displaySpecNameAr: "الشاشة (نص كامل)",
  displaySpecGroup: "display",
  linkDisplaySpec: true,
};

const LAPTOP_DISPLAY_FILTERS: FacetAttributeDef[] = [
  flt({
    key: "display_resolution",
    name_en: "Resolution",
    name_ar: "الدقة",
    type: "SELECT",
    displayGroup: "display",
    options: ["1920×1080", "2560×1440", "2880×1800", "3840×2160", "WQXGA", "4K UHD"],
    ...DISPLAY_FULL,
  }),
  flt({
    key: "screen_size",
    name_en: "Screen size",
    name_ar: "حجم الشاشة",
    type: "RANGE",
    unit: "inch",
    displayGroup: "display",
    ...DISPLAY_FULL,
  }),
  flt({
    key: "refresh_rate",
    name_en: "Refresh rate",
    name_ar: "معدل التحديث",
    type: "RANGE",
    unit: "Hz",
    displayGroup: "display",
    ...DISPLAY_FULL,
  }),
  flt({
    key: "display_panel",
    name_en: "Panel",
    name_ar: "نوع اللوحة",
    type: "SELECT",
    displayGroup: "display",
    options: ["IPS", "VA", "TN", "OLED", "Mini LED"],
    ...DISPLAY_FULL,
  }),
];

function buildLaptopsSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Gaming", "Business", "Ultrabook", "Workstation", "Creator"]),
    flt({
      key: "processor_family",
      name_en: "Processor",
      name_ar: "المعالج",
      type: "SELECT",
      displayGroup: "performance",
      options: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Ultra 7", "Ultra 9"],
      displaySpecKey: "processor_full",
      displaySpecNameEn: "Processor (full)",
      displaySpecNameAr: "المعالج (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({
      key: "gpu_model",
      name_en: "GPU",
      name_ar: "كرت الشاشة",
      type: "SELECT",
      displayGroup: "performance",
      options: ["RTX 4050", "RTX 4060", "RTX 4070", "RTX 5070", "RTX 5080", "RTX 5090", "Integrated"],
      displaySpecKey: "gpu_full",
      displaySpecNameEn: "GPU (full)",
      displaySpecNameAr: "كرت الشاشة (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({
      key: "ram_size",
      name_en: "RAM",
      name_ar: "الرام",
      type: "MULTI_SELECT",
      unit: "GB",
      displayGroup: "performance",
      options: ["8", "16", "32", "64"],
      displaySpecKey: "ram_display",
      displaySpecNameEn: "RAM (full)",
      displaySpecNameAr: "الرام (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({
      key: "memory_technology",
      name_en: "Memory technology",
      name_ar: "تقنية الذاكرة",
      type: "SELECT",
      displayGroup: "performance",
      options: ["DDR4", "DDR5", "LPDDR5"],
    }),
    flt({
      key: "storage_size",
      name_en: "Storage size",
      name_ar: "سعة التخزين",
      type: "MULTI_SELECT",
      unit: "GB",
      displayGroup: "performance",
      options: ["256", "512", "1024", "2048"],
      displaySpecKey: "storage_display",
      displaySpecNameEn: "Storage (full)",
      displaySpecNameAr: "التخزين (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({
      key: "storage_type",
      name_en: "Storage type",
      name_ar: "نوع التخزين",
      type: "SELECT",
      displayGroup: "performance",
      options: ["SSD", "HDD", "NVMe"],
      displaySpecKey: "storage_display",
      linkDisplaySpec: true,
    }),
    ...LAPTOP_DISPLAY_FILTERS,
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "processor_full", name_en: "Processor", name_ar: "المعالج (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "gpu_full", name_en: "GPU", name_ar: "كرت الشاشة (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "ram_display", name_en: "RAM", name_ar: "الرام (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "storage_display", name_en: "Storage", name_ar: "التخزين (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "display_full", name_en: "Display", name_ar: "الشاشة (نص كامل)", type: "TEXT", displayGroup: "display" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ];
}

function buildMonitorsSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Gaming", "Office", "Portable", "Curved"]),
    flt({
      key: "display_resolution",
      name_en: "Resolution",
      name_ar: "الدقة",
      type: "SELECT",
      displayGroup: "display",
      options: ["1920×1080", "2560×1440", "3840×2160", "3440×1440", "WQXGA"],
      ...DISPLAY_FULL,
    }),
    flt({
      key: "size_inch",
      name_en: "Size",
      name_ar: "الحجم",
      type: "RANGE",
      unit: "inch",
      displayGroup: "display",
      ...DISPLAY_FULL,
    }),
    flt({
      key: "refresh_rate",
      name_en: "Refresh rate",
      name_ar: "معدل التحديث",
      type: "RANGE",
      unit: "Hz",
      displayGroup: "display",
      ...DISPLAY_FULL,
    }),
    flt({
      key: "panel_type",
      name_en: "Panel",
      name_ar: "نوع اللوحة",
      type: "SELECT",
      displayGroup: "display",
      options: ["IPS", "VA", "TN", "OLED", "Mini LED"],
      ...DISPLAY_FULL,
    }),
    flt({
      key: "screen_shape",
      name_en: "Screen shape",
      name_ar: "شكل الشاشة",
      type: "SELECT",
      displayGroup: "display",
      options: ["Flat", "Curved"],
      ...DISPLAY_FULL,
    }),
    flt({
      key: "response_time_ms",
      name_en: "Response time",
      name_ar: "زمن الاستجابة",
      type: "RANGE",
      unit: "ms",
      displayGroup: "display",
      displaySpecKey: "performance_full",
      displaySpecNameEn: "Performance (full)",
      displaySpecNameAr: "الأداء (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({ key: "hdr", name_en: "HDR", name_ar: "HDR", type: "BOOLEAN", displayGroup: "display" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "display_full", name_en: "Display", name_ar: "الشاشة (نص كامل)", type: "TEXT", displayGroup: "display" }),
    ext({ key: "performance_full", name_en: "Performance", name_ar: "الأداء (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "ports_full", name_en: "Ports", name_ar: "المنافذ (نص كامل)", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildCamerasSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["DSLR", "Mirrorless", "Action", "Webcam", "PTZ"]),
    flt({
      key: "camera_type",
      name_en: "Camera type",
      name_ar: "نوع الكاميرا",
      type: "SELECT",
      displayGroup: "camera",
      options: ["Dome", "Bullet", "PTZ", "Mirrorless", "Webcam"],
      displaySpecKey: "camera_full",
      displaySpecNameEn: "Camera (full)",
      displaySpecNameAr: "الكاميرا (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({
      key: "resolution",
      name_en: "Resolution",
      name_ar: "الدقة",
      type: "SELECT",
      displayGroup: "camera",
      options: ["1080p", "2K", "4K", "8MP", "12MP", "24MP"],
      displaySpecKey: "camera_full",
      linkDisplaySpec: true,
    }),
    flt({
      key: "video_resolution",
      name_en: "Video resolution",
      name_ar: "دقة الفيديو",
      type: "SELECT",
      displayGroup: "camera",
      options: ["1080p", "4K", "6K", "8K"],
      displaySpecKey: "camera_full",
      linkDisplaySpec: true,
    }),
    flt({
      key: "wireless",
      name_en: "Wireless",
      name_ar: "لاسلكي",
      type: "BOOLEAN",
      displayGroup: "connectivity",
      displaySpecKey: "connectivity_full",
      displaySpecNameEn: "Connectivity (full)",
      displaySpecNameAr: "الاتصال (نص كامل)",
      linkDisplaySpec: true,
    }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "camera_full", name_en: "Camera", name_ar: "الكاميرا (نص كامل)", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "connectivity_full", name_en: "Connectivity", name_ar: "الاتصال (نص كامل)", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildComponentPartSchema(
  _partSlug: string,
  partNameEn: string,
  partNameAr: string,
  filters: FacetAttributeDef[],
): FacetAttributeDef[] {
  return [
    brandFilter(),
    flt({
      key: "component_type",
      name_en: "Component type",
      name_ar: "نوع القطعة",
      type: "SELECT",
      displayGroup: "identity",
      options: [partNameEn],
    }),
    ...filters,
    ext({ key: "spec_full", name_en: "Full specification", name_ar: "المواصفة الكاملة", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildNetworkingSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Router", "Switch", "Access Point", "Mesh", "Modem"]),
    flt({ key: "network_type", name_en: "Network type", name_ar: "نوع الشبكة", type: "SELECT", options: ["Home", "Enterprise", "Outdoor"] }),
    flt({ key: "wifi_standard", name_en: "Wi‑Fi standard", name_ar: "معيار الواي فاي", type: "SELECT", options: ["Wi‑Fi 5", "Wi‑Fi 6", "Wi‑Fi 6E", "Wi‑Fi 7"] }),
    flt({ key: "speed", name_en: "Speed", name_ar: "السرعة", type: "SELECT", options: ["100 Mbps", "1 Gbps", "2.5 Gbps", "10 Gbps"] }),
    flt({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "RANGE" }),
    flt({ key: "mesh_support", name_en: "Mesh", name_ar: "Mesh", type: "BOOLEAN" }),
    ext({ key: "network_full", name_en: "Network (full)", name_ar: "الشبكة (نص كامل)", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildPrintersSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    flt({ key: "printer_type", name_en: "Printer type", name_ar: "نوع الطابعة", type: "SELECT", options: ["Inkjet", "Laser", "Thermal", "3D"] }),
    flt({ key: "color_printing", name_en: "Color printing", name_ar: "طباعة ملونة", type: "BOOLEAN" }),
    flt({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN" }),
    flt({ key: "duplex", name_en: "Duplex", name_ar: "طباعة وجهين", type: "BOOLEAN" }),
    flt({ key: "scanner", name_en: "Scanner", name_ar: "ماسح", type: "BOOLEAN" }),
    ext({ key: "printer_full", name_en: "Printer (full)", name_ar: "الطابعة (نص كامل)", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildAudioSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Headset", "Earbuds", "Speaker", "Microphone", "Soundbar"]),
    flt({ key: "audio_type", name_en: "Audio type", name_ar: "نوع الصوت", type: "SELECT", options: ["Over-ear", "In-ear", "Studio", "Portable"] }),
    flt({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN" }),
    flt({ key: "noise_cancelling", name_en: "Noise cancelling", name_ar: "عزل الضوضاء", type: "BOOLEAN" }),
    flt({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "SELECT", options: ["USB", "3.5mm", "Bluetooth", "USB-C"] }),
    flt({ key: "battery_life", name_en: "Battery life", name_ar: "عمر البطارية", type: "RANGE", unit: "hour" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    ext({ key: "audio_full", name_en: "Audio (full)", name_ar: "الصوت (نص كامل)", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildSecuritySchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Camera", "NVR", "DVR", "Smart Lock", "Sensor"]),
    flt({ key: "security_type", name_en: "Security type", name_ar: "نوع الأمان", type: "SELECT", options: ["Camera", "Lock", "Alarm", "Sensor"] }),
    flt({ key: "resolution", name_en: "Resolution", name_ar: "الدقة", type: "SELECT", options: ["1080p", "2K", "4K", "8MP"] }),
    flt({ key: "night_vision", name_en: "Night vision", name_ar: "رؤية ليلية", type: "BOOLEAN" }),
    flt({ key: "indoor_outdoor", name_en: "Indoor / outdoor", name_ar: "داخلي / خارجي", type: "SELECT", options: ["Indoor", "Outdoor", "Both"] }),
    flt({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN" }),
    flt({ key: "storage_type", name_en: "Storage", name_ar: "التخزين", type: "SELECT", options: ["Local", "Cloud", "NVR"] }),
    ext({ key: "security_full", name_en: "Security (full)", name_ar: "الأمان (نص كامل)", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildSmartHomeSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Hub", "Switch", "Sensor", "Bulb", "Plug", "Thermostat"]),
    flt({ key: "device_type", name_en: "Device type", name_ar: "نوع الجهاز", type: "SELECT", options: ["Hub", "Light", "Plug", "Sensor", "Lock"] }),
    flt({ key: "ecosystem", name_en: "Ecosystem", name_ar: "النظام", type: "SELECT", options: ["Google", "Apple", "Amazon", "Matter", "Zigbee"] }),
    flt({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN" }),
    flt({ key: "app_control", name_en: "App control", name_ar: "تحكم بالتطبيق", type: "BOOLEAN" }),
    flt({ key: "voice_assistant", name_en: "Voice assistant", name_ar: "مساعد صوتي", type: "BOOLEAN" }),
    ext({ key: "smart_home_full", name_en: "Smart home (full)", name_ar: "منزل ذكي (نص كامل)", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

function buildGenericSchema(): FacetAttributeDef[] {
  return [
    brandFilter(),
    productTypeFilter(["Standard", "Pro", "Plus"]),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "spec_full", name_en: "Full specification", name_ar: "المواصفة الكاملة", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ];
}

/** Slug aliases → canonical preset slug. */
export const CATEGORY_SCHEMA_SLUG_ALIASES: Record<string, string> = {
  phone: "phones",
  tablet: "tablets",
  ipad: "tablets",
  "all-in-one": "computers",
  "desktop-pcs": "computers",
  "desktop-pc": "computers",
  "pc-parts": "components",
  cpu: "cpus",
  cpus: "cpus",
  gpu: "gpus",
  gpus: "gpus",
  motherboard: "motherboards",
  motherboards: "motherboards",
  ram: "memory",
  memory: "memory",
  storage: "storage",
  "power-supplies": "power-supplies",
  psu: "power-supplies",
  cooling: "cooling",
  monitor: "monitors",
  keyboard: "keyboards",
  keyboards: "keyboards",
  mouse: "mice",
  mice: "mice",
  headset: "audio",
  headsets: "audio",
  headphones: "audio",
  audio: "audio",
  camera: "cameras",
  cameras: "cameras",
  cctv: "cctv",
  "security-cameras": "cctv",
  networking: "networking",
  network: "networking",
  tv: "tvs",
  tvs: "tvs",
  printer: "printers",
  printers: "printers",
  "3d-printers": "printers",
  software: "software",
  chair: "accessories",
  chairs: "accessories",
  bag: "accessories",
  bags: "accessories",
  cables: "accessories",
  "smart-home": "smart-home",
  security: "security",
  electric: "electric",
  hardware: "hardware",
  gaming: "gaming",
};

export const CLASSIFICATION_SEED_BY_SLUG: Record<string, FacetAttributeDef[]> = {
  laptops: buildLaptopsSchema(),
  monitors: buildMonitorsSchema(),
  cameras: buildCamerasSchema(),
  phones: [
    brandFilter(),
    flt({ key: "chipset_family", name_en: "Chipset", name_ar: "الشريحة", type: "SELECT", displaySpecKey: "chipset_full", linkDisplaySpec: true }),
    flt({ key: "ram", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", unit: "GB", options: ["4", "6", "8", "12", "16", "32"], displaySpecKey: "ram_display", linkDisplaySpec: true }),
    flt({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "MULTI_SELECT", unit: "GB", options: ["64", "128", "256", "512", "1024"], displaySpecKey: "storage_display", linkDisplaySpec: true }),
    flt({ key: "screen_size", name_en: "Screen", name_ar: "الشاشة", type: "RANGE", unit: "inch", displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", unit: "Hz", displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "battery_capacity", name_en: "Battery", name_ar: "البطارية", type: "RANGE", unit: "mAh", displaySpecKey: "battery_full", linkDisplaySpec: true }),
    flt({ key: "network_5g", name_en: "5G", name_ar: "5G", type: "BOOLEAN", displaySpecKey: "network_full", linkDisplaySpec: true }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    ext({ key: "chipset_full", name_en: "Chipset", name_ar: "الشريحة (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "ram_display", name_en: "RAM", name_ar: "الرام (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "storage_display", name_en: "Storage", name_ar: "التخزين (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "display_full", name_en: "Display", name_ar: "الشاشة (نص كامل)", type: "TEXT", displayGroup: "display" }),
    ext({ key: "battery_full", name_en: "Battery", name_ar: "البطارية (نص كامل)", type: "TEXT", displayGroup: "battery" }),
    ext({ key: "network_full", name_en: "Network", name_ar: "الشبكة (نص كامل)", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  computers: [
    brandFilter(),
    productTypeFilter(["Desktop", "All-in-One", "Mini PC", "Workstation"]),
    flt({ key: "processor_family", name_en: "Processor", name_ar: "المعالج", type: "SELECT", displaySpecKey: "processor_full", linkDisplaySpec: true }),
    flt({ key: "ram_size", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", unit: "GB", options: ["8", "16", "32", "64"], displaySpecKey: "ram_display", linkDisplaySpec: true }),
    flt({ key: "storage_size", name_en: "Storage", name_ar: "التخزين", type: "RANGE", unit: "GB", displaySpecKey: "storage_display", linkDisplaySpec: true }),
    flt({ key: "gpu_model", name_en: "GPU", name_ar: "كرت الشاشة", type: "SELECT", displaySpecKey: "gpu_full", linkDisplaySpec: true }),
    ext({ key: "processor_full", name_en: "Processor", name_ar: "المعالج (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "gpu_full", name_en: "GPU", name_ar: "كرت الشاشة (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "ram_display", name_en: "RAM", name_ar: "الرام (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "storage_display", name_en: "Storage", name_ar: "التخزين (نص كامل)", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  components: [
    brandFilter(),
    flt({ key: "component_type", name_en: "Component type", name_ar: "نوع القطعة", type: "SELECT", options: ["CPU", "GPU", "RAM", "Storage", "Motherboard", "PSU", "Cooling"] }),
    flt({ key: "capacity", name_en: "Capacity", name_ar: "السعة", type: "RANGE", unit: "GB" }),
    flt({ key: "storage_type", name_en: "Storage type", name_ar: "نوع التخزين", type: "SELECT", options: ["SSD", "HDD", "NVMe"] }),
    flt({ key: "interface", name_en: "Interface", name_ar: "الواجهة", type: "SELECT", options: ["SATA", "NVMe", "PCIe", "USB"] }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  cpus: buildComponentPartSchema("cpu", "CPU", "معالج", [
    flt({ key: "socket", name_en: "Socket", name_ar: "المقبس", type: "SELECT", options: ["AM5", "AM4", "LGA1700", "LGA1851"] }),
    flt({ key: "generation", name_en: "Generation", name_ar: "الجيل", type: "SELECT" }),
    flt({ key: "cores", name_en: "Cores", name_ar: "الأنوية", type: "RANGE" }),
    flt({ key: "threads", name_en: "Threads", name_ar: "الخيوط", type: "RANGE" }),
    flt({ key: "integrated_graphics", name_en: "Integrated graphics", name_ar: "رسوميات مدمجة", type: "BOOLEAN" }),
  ]),
  gpus: buildComponentPartSchema("gpu", "GPU", "كرت شاشة", [
    flt({ key: "gpu_model", name_en: "GPU model", name_ar: "الموديل", type: "SELECT", displaySpecKey: "spec_full", linkDisplaySpec: true }),
    flt({ key: "vram", name_en: "VRAM", name_ar: "ذاكرة كرت الشاشة", type: "RANGE", unit: "GB" }),
    flt({ key: "memory_type", name_en: "Memory type", name_ar: "نوع الذاكرة", type: "SELECT", options: ["GDDR6", "GDDR7"] }),
    flt({ key: "series", name_en: "Series", name_ar: "السلسلة", type: "SELECT" }),
  ]),
  motherboards: buildComponentPartSchema("motherboard", "Motherboard", "لوحة أم", [
    flt({ key: "socket", name_en: "Socket", name_ar: "المقبس", type: "SELECT" }),
    flt({ key: "chipset", name_en: "Chipset", name_ar: "الشريحة", type: "SELECT" }),
    flt({ key: "ram_type", name_en: "RAM type", name_ar: "نوع الرام", type: "SELECT", options: ["DDR4", "DDR5"] }),
    flt({ key: "form_factor", name_en: "Form factor", name_ar: "الحجم", type: "SELECT", options: ["ATX", "Micro-ATX", "Mini-ITX"] }),
    flt({ key: "wifi", name_en: "Wi‑Fi", name_ar: "واي فاي", type: "BOOLEAN" }),
  ]),
  memory: buildComponentPartSchema("ram", "RAM", "ذاكرة", [
    flt({ key: "capacity", name_en: "Capacity", name_ar: "السعة", type: "SELECT", options: ["8", "16", "32", "64"], displaySpecKey: "spec_full", linkDisplaySpec: true }),
    flt({ key: "memory_type", name_en: "Type", name_ar: "النوع", type: "SELECT", options: ["DDR4", "DDR5"] }),
    flt({ key: "speed", name_en: "Speed", name_ar: "السرعة", type: "RANGE", unit: "MHz" }),
    flt({ key: "kit", name_en: "Kit", name_ar: "عدد القطع", type: "SELECT", options: ["Single", "Dual", "Quad"] }),
    flt({ key: "rgb", name_en: "RGB", name_ar: "RGB", type: "BOOLEAN" }),
  ]),
  storage: buildComponentPartSchema("storage", "Storage", "تخزين", [
    flt({ key: "capacity", name_en: "Capacity", name_ar: "السعة", type: "RANGE", unit: "GB", displaySpecKey: "spec_full", linkDisplaySpec: true }),
    flt({ key: "storage_type", name_en: "Type", name_ar: "النوع", type: "SELECT", options: ["SSD", "HDD", "NVMe"] }),
    flt({ key: "interface", name_en: "Interface", name_ar: "الواجهة", type: "SELECT", options: ["SATA", "NVMe", "PCIe"] }),
    flt({ key: "read_speed", name_en: "Read speed", name_ar: "سرعة القراءة", type: "RANGE", unit: "MB/s" }),
    flt({ key: "form_factor", name_en: "Form factor", name_ar: "الحجم", type: "SELECT", options: ["2.5\"", "M.2", "3.5\""] }),
  ]),
  "power-supplies": buildComponentPartSchema("psu", "PSU", "مزود طاقة", [
    flt({ key: "wattage", name_en: "Wattage", name_ar: "القدرة", type: "RANGE", unit: "W" }),
    flt({ key: "efficiency_rating", name_en: "Efficiency", name_ar: "الكفاءة", type: "SELECT", options: ["80 Plus", "Bronze", "Gold", "Platinum"] }),
    flt({ key: "modular", name_en: "Modular", name_ar: "معياري", type: "BOOLEAN" }),
  ]),
  cooling: buildComponentPartSchema("cooling", "Cooling", "تبريد", [
    flt({ key: "cooling_type", name_en: "Cooling type", name_ar: "نوع التبريد", type: "SELECT", options: ["Air", "AIO", "Custom"] }),
    flt({ key: "radiator_size", name_en: "Radiator size", name_ar: "حجم الرادياتور", type: "SELECT", options: ["120mm", "240mm", "360mm"] }),
    flt({ key: "socket_support", name_en: "Socket support", name_ar: "دعم المقبس", type: "MULTI_SELECT" }),
    flt({ key: "rgb", name_en: "RGB", name_ar: "RGB", type: "BOOLEAN" }),
  ]),
  networking: buildNetworkingSchema(),
  printers: buildPrintersSchema(),
  audio: buildAudioSchema(),
  accessories: [
    brandFilter(),
    productTypeFilter(["Keyboard", "Mouse", "Headset", "Cable", "Bag", "Chair", "Adapter"]),
    flt({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "SELECT", options: ["USB", "Wireless", "Bluetooth", "USB-C"] }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    flt({ key: "compatibility", name_en: "Compatibility", name_ar: "التوافق", type: "SELECT" }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT", displayGroup: "specs" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  keyboards: [
    brandFilter(),
    flt({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "SELECT", options: ["USB", "Wireless", "Bluetooth"] }),
    flt({ key: "switch_type", name_en: "Switch type", name_ar: "نوع المفاتيح", type: "SELECT", options: ["Mechanical", "Membrane", "Optical"] }),
    flt({ key: "layout", name_en: "Layout", name_ar: "التخطيط", type: "SELECT", options: ["Full", "TKL", "60%"] }),
    flt({ key: "rgb", name_en: "RGB", name_ar: "RGB", type: "BOOLEAN" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT" }),
  ],
  mice: [
    brandFilter(),
    flt({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "SELECT", options: ["USB", "Wireless", "Bluetooth"] }),
    flt({ key: "dpi", name_en: "DPI", name_ar: "DPI", type: "RANGE" }),
    flt({ key: "rgb", name_en: "RGB", name_ar: "RGB", type: "BOOLEAN" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT" }),
  ],
  tablets: [
    brandFilter(),
    flt({ key: "screen_size", name_en: "Screen", name_ar: "الشاشة", type: "RANGE", unit: "inch", displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "SELECT", options: ["64", "128", "256", "512", "1024"] }),
    flt({ key: "connectivity", name_en: "Connectivity", name_ar: "الاتصال", type: "SELECT", options: ["Wi‑Fi", "Wi‑Fi + Cellular"] }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR" }),
    ext({ key: "display_full", name_en: "Display", name_ar: "الشاشة (نص كامل)", type: "TEXT", displayGroup: "display" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  tvs: [
    brandFilter(),
    flt({ key: "size_inch", name_en: "Size", name_ar: "الحجم", type: "RANGE", unit: "inch", displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "resolution", name_en: "Resolution", name_ar: "الدقة", type: "SELECT", options: ["4K", "8K", "1080p"], displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "panel_type", name_en: "Panel", name_ar: "اللوحة", type: "SELECT", options: ["LED", "QLED", "OLED", "Mini LED"], displaySpecKey: "display_full", linkDisplaySpec: true }),
    flt({ key: "smart_os", name_en: "Smart OS", name_ar: "نظام ذكي", type: "SELECT", options: ["Google TV", "webOS", "Tizen", "Fire TV"] }),
    flt({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", unit: "Hz" }),
    ext({ key: "display_full", name_en: "Display", name_ar: "الشاشة (نص كامل)", type: "TEXT", displayGroup: "display" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
  ],
  cctv: buildCamerasSchema(),
  security: buildSecuritySchema(),
  "smart-home": buildSmartHomeSchema(),
  software: [
    brandFilter(),
    flt({ key: "license_type", name_en: "License", name_ar: "الترخيص", type: "SELECT", options: ["Retail", "OEM", "Subscription"] }),
    flt({ key: "platform", name_en: "Platform", name_ar: "المنصة", type: "SELECT", options: ["Windows", "macOS", "Cross-platform"] }),
    ext({ key: "software_full", name_en: "Software", name_ar: "البرنامج (نص كامل)", type: "TEXT" }),
  ],
  gaming: [
    brandFilter(),
    flt({ key: "platform", name_en: "Platform", name_ar: "المنصة", type: "SELECT", options: ["PC", "PlayStation", "Xbox", "Nintendo"] }),
    flt({ key: "product_type", name_en: "Product type", name_ar: "نوع المنتج", type: "SELECT" }),
    flt({ key: "rgb", name_en: "RGB", name_ar: "RGB", type: "BOOLEAN" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT" }),
  ],
  electric: [
    brandFilter(),
    flt({ key: "wattage", name_en: "Wattage", name_ar: "القدرة", type: "RANGE", unit: "W" }),
    flt({ key: "voltage", name_en: "Voltage", name_ar: "الجهد", type: "RANGE", unit: "V" }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT" }),
  ],
  hardware: [
    brandFilter(),
    flt({ key: "product_type", name_en: "Product type", name_ar: "نوع المنتج", type: "SELECT" }),
    flt({ key: "port_count", name_en: "Ports", name_ar: "المنافذ", type: "RANGE" }),
    flt({ key: "wifi_standard", name_en: "Wi‑Fi", name_ar: "واي فاي", type: "SELECT" }),
    ext({ key: "spec_full", name_en: "Specification", name_ar: "المواصفة الكاملة", type: "TEXT" }),
  ],
  "power-solutions": [
    brandFilter(),
    flt({ key: "wattage", name_en: "Wattage", name_ar: "القدرة", type: "RANGE", unit: "W" }),
    flt({ key: "fast_charging", name_en: "Fast charging", name_ar: "شحن سريع", type: "BOOLEAN" }),
    ext({ key: "charging_full", name_en: "Charging", name_ar: "الشحن (نص كامل)", type: "TEXT", displayGroup: "battery" }),
  ],
};

export function resolveCategorySchemaSlug(slug: string): string {
  const k = slug.trim().toLowerCase();
  return CATEGORY_SCHEMA_SLUG_ALIASES[k] ?? k;
}

/** Preset schema for a category slug (generic fallback when unknown). */
export function getCategoryFilterSchema(slug: string): FacetAttributeDef[] {
  const canonical = resolveCategorySchemaSlug(slug);
  return CLASSIFICATION_SEED_BY_SLUG[canonical] ?? buildGenericSchema();
}
