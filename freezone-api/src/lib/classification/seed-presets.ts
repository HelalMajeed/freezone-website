import type { FacetAttributeDef } from "@/lib/data";
import type { AttributeType } from "./types";

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
};

function a(p: PresetAttr): FacetAttributeDef {
  return {
    key: p.key,
    name_en: p.name_en,
    name_ar: p.name_ar,
    type: p.type,
    filterable: p.filterable === true,
    searchable: p.searchable ?? false,
    comparable: p.comparable ?? false,
    required: p.required ?? false,
    unit: p.unit,
    displayGroup: p.displayGroup ?? "specs",
    options: p.options,
  };
}

/** Visible filters — filterable=true */
function flt(p: Omit<PresetAttr, "filterable">): FacetAttributeDef {
  return a({ ...p, filterable: true });
}

/** Extended specs (PDP + admin only) — filterable=false */
function ext(p: Omit<PresetAttr, "filterable">): FacetAttributeDef {
  return a({ ...p, filterable: false });
}

/**
 * Category slug → full attribute schema.
 * filterable=true → sidebar filters only.
 * filterable=false → product page extended specs (not in filter sidebar).
 */
export const CLASSIFICATION_SEED_BY_SLUG: Record<string, FacetAttributeDef[]> = {
  phones: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", searchable: true, displayGroup: "identity" }),
    flt({ key: "ram", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", unit: "GB", displayGroup: "performance", options: ["4", "6", "8", "12", "16", "18"] }),
    flt({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "MULTI_SELECT", unit: "GB", displayGroup: "performance", options: ["64", "128", "256", "512", "1024"] }),
    flt({ key: "screen_size", name_en: "Screen size", name_ar: "حجم الشاشة", type: "RANGE", unit: "inch", displayGroup: "display" }),
    flt({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", unit: "Hz", displayGroup: "display" }),
    flt({ key: "battery_capacity", name_en: "Battery", name_ar: "البطارية", type: "RANGE", unit: "mAh", displayGroup: "battery" }),
    flt({ key: "network_5g", name_en: "5G", name_ar: "شبكة 5G", type: "BOOLEAN", displayGroup: "connectivity" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", searchable: true, displayGroup: "identity" }),
    ext({ key: "chipset", name_en: "Chipset", name_ar: "الشريحة", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "cpu", name_en: "CPU", name_ar: "المعالج", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "gpu", name_en: "GPU", name_ar: "كرت الشاشة", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "os", name_en: "OS", name_ar: "نظام التشغيل", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "screen_type", name_en: "Screen type", name_ar: "نوع الشاشة", type: "SELECT", displayGroup: "display", options: ["AMOLED", "OLED", "LCD", "IPS"] }),
    ext({ key: "screen_resolution", name_en: "Resolution", name_ar: "الدقة", type: "TEXT", displayGroup: "display" }),
    ext({ key: "screen_protection", name_en: "Screen protection", name_ar: "حماية الشاشة", type: "TEXT", displayGroup: "display" }),
    ext({ key: "rear_camera_main", name_en: "Main camera", name_ar: "الكاميرا الرئيسية", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "rear_camera_ultrawide", name_en: "Ultrawide camera", name_ar: "كاميرا واسعة", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "front_camera", name_en: "Front camera", name_ar: "الكاميرا الأمامية", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "video_recording", name_en: "Video recording", name_ar: "تسجيل الفيديو", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "charging_watt", name_en: "Charging", name_ar: "الشحن", type: "RANGE", unit: "W", displayGroup: "battery" }),
    ext({ key: "wireless_charging", name_en: "Wireless charging", name_ar: "شحن لاسلكي", type: "BOOLEAN", displayGroup: "battery" }),
    ext({ key: "sim_type", name_en: "SIM", name_ar: "الشريحة", type: "SELECT", displayGroup: "connectivity", options: ["Single", "Dual", "eSIM"] }),
    ext({ key: "wifi", name_en: "Wi‑Fi", name_ar: "واي فاي", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "bluetooth", name_en: "Bluetooth", name_ar: "بلوتوث", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "nfc", name_en: "NFC", name_ar: "NFC", type: "BOOLEAN", displayGroup: "connectivity" }),
    ext({ key: "ip_rating", name_en: "IP rating", name_ar: "مقاومة الماء", type: "SELECT", displayGroup: "design", options: ["IP54", "IP65", "IP67", "IP68"] }),
    ext({ key: "fingerprint", name_en: "Fingerprint", name_ar: "بصمة", type: "TEXT", displayGroup: "design" }),
    ext({ key: "dimensions", name_en: "Dimensions", name_ar: "الأبعاد", type: "TEXT", displayGroup: "design" }),
    ext({ key: "weight", name_en: "Weight", name_ar: "الوزن", type: "RANGE", unit: "g", displayGroup: "design" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  laptops: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", searchable: true, displayGroup: "identity" }),
    flt({ key: "processor_family", name_en: "Processor", name_ar: "عائلة المعالج", type: "SELECT", displayGroup: "performance", options: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Ultra 7", "Ultra 9", "Apple M1", "Apple M2", "Apple M3"] }),
    flt({ key: "ram_size", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", unit: "GB", displayGroup: "performance", options: ["8", "16", "32", "64"] }),
    flt({ key: "storage_size", name_en: "Storage size", name_ar: "سعة التخزين", type: "RANGE", unit: "GB", displayGroup: "performance" }),
    flt({ key: "storage_type", name_en: "Storage type", name_ar: "نوع التخزين", type: "SELECT", displayGroup: "performance", options: ["SSD", "HDD", "Hybrid"] }),
    flt({ key: "gpu_model", name_en: "GPU", name_ar: "كرت الشاشة", type: "SELECT", displayGroup: "performance" }),
    flt({ key: "screen_size", name_en: "Screen size", name_ar: "حجم الشاشة", type: "RANGE", unit: "inch", displayGroup: "display" }),
    flt({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", unit: "Hz", displayGroup: "display" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "processor_model", name_en: "Processor model", name_ar: "موديل المعالج", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "cpu_cores", name_en: "CPU cores", name_ar: "أنوية المعالج", type: "RANGE", displayGroup: "performance" }),
    ext({ key: "cpu_threads", name_en: "CPU threads", name_ar: "خيوط المعالج", type: "RANGE", displayGroup: "performance" }),
    ext({ key: "gpu_vram", name_en: "GPU VRAM", name_ar: "ذاكرة كرت الشاشة", type: "RANGE", unit: "GB", displayGroup: "performance" }),
    ext({ key: "screen_resolution", name_en: "Resolution", name_ar: "الدقة", type: "TEXT", displayGroup: "display" }),
    ext({ key: "panel_type", name_en: "Panel type", name_ar: "نوع اللوحة", type: "SELECT", displayGroup: "display", options: ["IPS", "VA", "TN", "OLED", "Mini LED"] }),
    ext({ key: "brightness", name_en: "Brightness", name_ar: "السطوع", type: "RANGE", unit: "nits", displayGroup: "display" }),
    ext({ key: "battery_wh", name_en: "Battery", name_ar: "البطارية", type: "RANGE", unit: "Wh", displayGroup: "battery" }),
    ext({ key: "charger_watt", name_en: "Charger", name_ar: "الشاحن", type: "RANGE", unit: "W", displayGroup: "battery" }),
    ext({ key: "keyboard_backlight", name_en: "Keyboard backlight", name_ar: "إضاءة لوحة المفاتيح", type: "BOOLEAN", displayGroup: "design" }),
    ext({ key: "webcam", name_en: "Webcam", name_ar: "الكاميرا", type: "TEXT", displayGroup: "design" }),
    ext({ key: "wifi", name_en: "Wi‑Fi", name_ar: "واي فاي", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "bluetooth", name_en: "Bluetooth", name_ar: "بلوتوث", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "os", name_en: "OS", name_ar: "نظام التشغيل", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "weight", name_en: "Weight", name_ar: "الوزن", type: "RANGE", unit: "kg", displayGroup: "design" }),
    ext({ key: "dimensions", name_en: "Dimensions", name_ar: "الأبعاد", type: "TEXT", displayGroup: "design" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  monitors: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "size_inch", name_en: "Size", name_ar: "الحجم", type: "RANGE", unit: "inch", displayGroup: "display" }),
    flt({ key: "resolution", name_en: "Resolution", name_ar: "الدقة", type: "SELECT", displayGroup: "display", options: ["1920×1080", "2560×1440", "3840×2160", "3440×1440"] }),
    flt({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", unit: "Hz", displayGroup: "display" }),
    flt({ key: "panel_type", name_en: "Panel", name_ar: "نوع اللوحة", type: "SELECT", displayGroup: "display", options: ["IPS", "VA", "TN", "OLED", "Mini LED"] }),
    flt({ key: "response_time_ms", name_en: "Response time", name_ar: "زمن الاستجابة", type: "RANGE", unit: "ms", displayGroup: "display" }),
    flt({ key: "hdr", name_en: "HDR", name_ar: "HDR", type: "BOOLEAN", displayGroup: "display" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "aspect_ratio", name_en: "Aspect ratio", name_ar: "نسبة العرض", type: "SELECT", displayGroup: "display", options: ["16:9", "16:10", "21:9", "32:9"] }),
    ext({ key: "brightness", name_en: "Brightness", name_ar: "السطوع", type: "RANGE", unit: "nits", displayGroup: "display" }),
    ext({ key: "contrast_ratio", name_en: "Contrast", name_ar: "التباين", type: "TEXT", displayGroup: "display" }),
    ext({ key: "color_gamut", name_en: "Color gamut", name_ar: "طيف الألوان", type: "TEXT", displayGroup: "display" }),
    ext({ key: "adaptive_sync", name_en: "Adaptive sync", name_ar: "مزامنة تكيفية", type: "TEXT", displayGroup: "display" }),
    ext({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "speakers", name_en: "Speakers", name_ar: "سماعات", type: "BOOLEAN", displayGroup: "design" }),
    ext({ key: "vesa_mount", name_en: "VESA mount", name_ar: "تثبيت VESA", type: "BOOLEAN", displayGroup: "design" }),
    ext({ key: "stand_adjustment", name_en: "Stand adjustment", name_ar: "قاعدة الشاشة", type: "TEXT", displayGroup: "design" }),
    ext({ key: "power_consumption", name_en: "Power consumption", name_ar: "استهلاك الطاقة", type: "RANGE", unit: "W", displayGroup: "other" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  cctv: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "camera_type", name_en: "Camera type", name_ar: "نوع الكاميرا", type: "SELECT", displayGroup: "camera", options: ["Dome", "Bullet", "PTZ", "Turret"] }),
    flt({ key: "sensor_type", name_en: "Sensor", name_ar: "المستشعر", type: "SELECT", displayGroup: "camera" }),
    flt({ key: "resolution_mp", name_en: "Resolution", name_ar: "الدقة", type: "RANGE", unit: "MP", displayGroup: "camera" }),
    flt({ key: "ibis", name_en: "IBIS", name_ar: "تثبيت", type: "BOOLEAN", displayGroup: "camera" }),
    flt({ key: "max_video_resolution", name_en: "Max video", name_ar: "أقصى فيديو", type: "SELECT", displayGroup: "camera" }),
    flt({ key: "mount", name_en: "Mount", name_ar: "التركيب", type: "SELECT", displayGroup: "design" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "autofocus_points", name_en: "Autofocus points", name_ar: "نقاط التركيز", type: "RANGE", displayGroup: "camera" }),
    ext({ key: "iso_range", name_en: "ISO range", name_ar: "نطاق ISO", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "shutter_speed", name_en: "Shutter speed", name_ar: "سرعة الغالق", type: "TEXT", displayGroup: "camera" }),
    ext({ key: "burst_rate", name_en: "Burst rate", name_ar: "التصوير المتتابع", type: "RANGE", unit: "fps", displayGroup: "camera" }),
    ext({ key: "viewfinder", name_en: "Viewfinder", name_ar: "المنظار", type: "TEXT", displayGroup: "display" }),
    ext({ key: "screen", name_en: "Screen", name_ar: "الشاشة", type: "TEXT", displayGroup: "display" }),
    ext({ key: "storage_media", name_en: "Storage media", name_ar: "وسائط التخزين", type: "TEXT", displayGroup: "other" }),
    ext({ key: "battery_life", name_en: "Battery life", name_ar: "عمر البطارية", type: "RANGE", displayGroup: "battery" }),
    ext({ key: "connectivity", name_en: "Connectivity", name_ar: "الاتصال", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "weight", name_en: "Weight", name_ar: "الوزن", type: "RANGE", unit: "g", displayGroup: "design" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  accessories: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "type", name_en: "Type", name_ar: "النوع", type: "SELECT", displayGroup: "design", options: ["Headphones", "Earbuds", "Speaker", "Microphone"] }),
    flt({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN", displayGroup: "connectivity" }),
    flt({ key: "noise_cancelling", name_en: "Noise cancelling", name_ar: "عزل الضوضاء", type: "BOOLEAN", displayGroup: "design" }),
    flt({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", displayGroup: "design" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "battery_life", name_en: "Battery life", name_ar: "عمر البطارية", type: "RANGE", unit: "hour", displayGroup: "battery" }),
    ext({ key: "connectivity", name_en: "Connectivity", name_ar: "الاتصال", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "weight", name_en: "Weight", name_ar: "الوزن", type: "RANGE", unit: "g", displayGroup: "design" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  gaming: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "platform", name_en: "Platform", name_ar: "المنصة", type: "SELECT", displayGroup: "performance", options: ["PC", "PlayStation", "Xbox", "Nintendo"] }),
    flt({ key: "product_type", name_en: "Product type", name_ar: "نوع المنتج", type: "SELECT", displayGroup: "design" }),
    flt({ key: "rgb", name_en: "RGB lighting", name_ar: "إضاءة RGB", type: "BOOLEAN", displayGroup: "design" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  components: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "storage_type", name_en: "Storage type", name_ar: "نوع التخزين", type: "SELECT", displayGroup: "performance", options: ["SSD", "HDD", "NVMe"] }),
    flt({ key: "capacity", name_en: "Capacity", name_ar: "السعة", type: "RANGE", unit: "GB", displayGroup: "performance" }),
    flt({ key: "interface", name_en: "Interface", name_ar: "الواجهة", type: "SELECT", displayGroup: "connectivity", options: ["SATA", "NVMe", "USB 3.2"] }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "read_speed", name_en: "Read speed", name_ar: "سرعة القراءة", type: "RANGE", unit: "MB/s", displayGroup: "performance" }),
    ext({ key: "write_speed", name_en: "Write speed", name_ar: "سرعة الكتابة", type: "RANGE", unit: "MB/s", displayGroup: "performance" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  computers: [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "processor_family", name_en: "Processor", name_ar: "المعالج", type: "SELECT", displayGroup: "performance" }),
    flt({ key: "ram_size", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", unit: "GB", displayGroup: "performance" }),
    flt({ key: "storage_size", name_en: "Storage", name_ar: "التخزين", type: "RANGE", unit: "GB", displayGroup: "performance" }),
    flt({ key: "gpu_model", name_en: "GPU", name_ar: "كرت الشاشة", type: "SELECT", displayGroup: "performance" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "screen_size", name_en: "Screen", name_ar: "الشاشة", type: "RANGE", unit: "inch", displayGroup: "display" }),
    ext({ key: "os", name_en: "OS", name_ar: "نظام التشغيل", type: "TEXT", displayGroup: "performance" }),
    ext({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "TEXT", displayGroup: "connectivity" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
  "power-solutions": [
    flt({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", displayGroup: "identity" }),
    flt({ key: "wattage", name_en: "Wattage", name_ar: "القدرة", type: "RANGE", unit: "W", displayGroup: "performance" }),
    flt({ key: "fast_charging", name_en: "Fast charging", name_ar: "شحن سريع", type: "BOOLEAN", displayGroup: "battery" }),
    ext({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", displayGroup: "identity" }),
    ext({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "RANGE", displayGroup: "connectivity" }),
    ext({ key: "connector_type", name_en: "Connector", name_ar: "الموصل", type: "SELECT", displayGroup: "connectivity" }),
    ext({ key: "warranty", name_en: "Warranty", name_ar: "الضمان", type: "TEXT", displayGroup: "warranty" }),
  ],
};
