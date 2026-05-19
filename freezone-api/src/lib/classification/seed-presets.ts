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
    filterable: p.filterable ?? true,
    searchable: p.searchable ?? false,
    comparable: p.comparable ?? false,
    required: p.required ?? false,
    unit: p.unit,
    displayGroup: p.displayGroup ?? "specs",
    options: p.options,
  };
}

/** Category slug → full attribute schema (storefront filters + admin product form). */
export const CLASSIFICATION_SEED_BY_SLUG: Record<string, FacetAttributeDef[]> = {
  phones: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true, searchable: true, displayGroup: "identity" }),
    a({ key: "model", name_en: "Model", name_ar: "الموديل", type: "TEXT", filterable: false, searchable: true, displayGroup: "identity" }),
    a({ key: "chipset", name_en: "Chipset", name_ar: "المعالج", type: "SELECT", filterable: true }),
    a({ key: "ram", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", filterable: true, unit: "GB", options: ["4", "6", "8", "12", "16", "18"] }),
    a({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "MULTI_SELECT", filterable: true, unit: "GB", options: ["64", "128", "256", "512", "1024"] }),
    a({ key: "screen_size", name_en: "Screen size", name_ar: "حجم الشاشة", type: "RANGE", filterable: true, unit: "inch" }),
    a({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", filterable: true, unit: "Hz" }),
    a({ key: "battery_capacity", name_en: "Battery", name_ar: "البطارية", type: "RANGE", filterable: true, unit: "mAh" }),
    a({ key: "network_5g", name_en: "5G", name_ar: "شبكة 5G", type: "BOOLEAN", filterable: true }),
    a({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", filterable: true, displayGroup: "variants" }),
  ],
  laptops: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true, searchable: true }),
    a({ key: "processor_family", name_en: "Processor", name_ar: "المعالج", type: "SELECT", filterable: true, options: ["Core i3", "Core i5", "Core i7", "Core i9", "Ryzen 5", "Ryzen 7", "Ryzen 9", "Apple M1", "Apple M2", "Apple M3"] }),
    a({ key: "ram_size", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", filterable: true, unit: "GB", options: ["8", "16", "32", "64"] }),
    a({ key: "storage_type", name_en: "Storage type", name_ar: "نوع التخزين", type: "SELECT", filterable: true, options: ["SSD", "HDD", "Hybrid"] }),
    a({ key: "storage_size", name_en: "Storage size", name_ar: "سعة التخزين", type: "RANGE", filterable: true, unit: "GB" }),
    a({ key: "gpu_model", name_en: "GPU", name_ar: "كرت الشاشة", type: "SELECT", filterable: true }),
    a({ key: "screen_size", name_en: "Screen size", name_ar: "حجم الشاشة", type: "RANGE", filterable: true, unit: "inch" }),
    a({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", filterable: true, unit: "Hz" }),
    a({ key: "battery_wh", name_en: "Battery", name_ar: "البطارية", type: "RANGE", filterable: false, unit: "Wh" }),
    a({ key: "weight", name_en: "Weight", name_ar: "الوزن", type: "RANGE", filterable: false, unit: "kg" }),
  ],
  monitors: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "panel_type", name_en: "Panel", name_ar: "نوع اللوحة", type: "SELECT", filterable: true, options: ["IPS", "VA", "TN", "OLED", "Mini LED"] }),
    a({ key: "resolution", name_en: "Resolution", name_ar: "الدقة", type: "SELECT", filterable: true, options: ["1920×1080", "2560×1440", "3840×2160", "3440×1440"] }),
    a({ key: "refresh_rate", name_en: "Refresh rate", name_ar: "معدل التحديث", type: "RANGE", filterable: true, unit: "Hz" }),
    a({ key: "size_inch", name_en: "Size", name_ar: "الحجم", type: "RANGE", filterable: true, unit: "inch" }),
    a({ key: "hdr", name_en: "HDR", name_ar: "HDR", type: "BOOLEAN", filterable: true }),
    a({ key: "response_time_ms", name_en: "Response time", name_ar: "زمن الاستجابة", type: "RANGE", filterable: true, unit: "ms" }),
  ],
  cctv: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "camera_type", name_en: "Camera type", name_ar: "نوع الكاميرا", type: "SELECT", filterable: true, options: ["Dome", "Bullet", "PTZ", "Turret"] }),
    a({ key: "sensor_type", name_en: "Sensor", name_ar: "المستشعر", type: "SELECT", filterable: true }),
    a({ key: "resolution_mp", name_en: "Resolution", name_ar: "الدقة", type: "RANGE", filterable: true, unit: "MP" }),
    a({ key: "ibis", name_en: "IBIS", name_ar: "تثبيت", type: "BOOLEAN", filterable: true }),
    a({ key: "max_video_resolution", name_en: "Max video", name_ar: "أقصى فيديو", type: "SELECT", filterable: true }),
    a({ key: "mount", name_en: "Mount", name_ar: "التركيب", type: "SELECT", filterable: true }),
  ],
  accessories: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "type", name_en: "Type", name_ar: "النوع", type: "SELECT", filterable: true, options: ["Headphones", "Earbuds", "Speaker", "Microphone"] }),
    a({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN", filterable: true }),
    a({ key: "noise_cancelling", name_en: "Noise cancelling", name_ar: "عزل الضوضاء", type: "BOOLEAN", filterable: true }),
    a({ key: "battery_life", name_en: "Battery life", name_ar: "عمر البطارية", type: "RANGE", filterable: true, unit: "hour" }),
    a({ key: "color", name_en: "Color", name_ar: "اللون", type: "COLOR", filterable: true }),
  ],
  gaming: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "platform", name_en: "Platform", name_ar: "المنصة", type: "SELECT", filterable: true, options: ["PC", "PlayStation", "Xbox", "Nintendo"] }),
    a({ key: "product_type", name_en: "Product type", name_ar: "نوع المنتج", type: "SELECT", filterable: true }),
    a({ key: "connection_type", name_en: "Connection", name_ar: "الاتصال", type: "SELECT", filterable: true }),
    a({ key: "rgb", name_en: "RGB lighting", name_ar: "إضاءة RGB", type: "BOOLEAN", filterable: true }),
  ],
  networking: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "wifi_standard", name_en: "Wi‑Fi", name_ar: "واي فاي", type: "SELECT", filterable: true, options: ["Wi‑Fi 5", "Wi‑Fi 6", "Wi‑Fi 6E", "Wi‑Fi 7"] }),
    a({ key: "speed", name_en: "Speed", name_ar: "السرعة", type: "RANGE", filterable: true, unit: "Mbps" }),
    a({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "RANGE", filterable: true }),
    a({ key: "mesh_support", name_en: "Mesh", name_ar: "Mesh", type: "BOOLEAN", filterable: true }),
  ],
  components: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "storage_type", name_en: "Storage type", name_ar: "نوع التخزين", type: "SELECT", filterable: true, options: ["SSD", "HDD", "NVMe"] }),
    a({ key: "capacity", name_en: "Capacity", name_ar: "السعة", type: "RANGE", filterable: true, unit: "GB" }),
    a({ key: "interface", name_en: "Interface", name_ar: "الواجهة", type: "SELECT", filterable: true, options: ["SATA", "NVMe", "USB 3.2"] }),
    a({ key: "read_speed", name_en: "Read speed", name_ar: "سرعة القراءة", type: "RANGE", filterable: true, unit: "MB/s" }),
  ],
  "power-solutions": [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "wattage", name_en: "Wattage", name_ar: "القدرة", type: "RANGE", filterable: true, unit: "W" }),
    a({ key: "ports", name_en: "Ports", name_ar: "المنافذ", type: "RANGE", filterable: true }),
    a({ key: "fast_charging", name_en: "Fast charging", name_ar: "شحن سريع", type: "BOOLEAN", filterable: true }),
    a({ key: "connector_type", name_en: "Connector", name_ar: "الموصل", type: "SELECT", filterable: true }),
  ],
  computers: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "cpu", name_en: "Processor", name_ar: "المعالج", type: "SELECT", filterable: true }),
    a({ key: "ram", name_en: "RAM", name_ar: "الرام", type: "MULTI_SELECT", filterable: true, unit: "GB" }),
    a({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "SELECT", filterable: true }),
    a({ key: "gpu", name_en: "GPU", name_ar: "كرت الشاشة", type: "SELECT", filterable: true }),
    a({ key: "screen_size", name_en: "Screen", name_ar: "الشاشة", type: "RANGE", filterable: true, unit: "inch" }),
  ],
  security: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "system_type", name_en: "System type", name_ar: "نوع النظام", type: "SELECT", filterable: true }),
    a({ key: "channel_count", name_en: "Channels", name_ar: "القنوات", type: "RANGE", filterable: true }),
  ],
  printers: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "print_technology", name_en: "Technology", name_ar: "التقنية", type: "SELECT", filterable: true }),
    a({ key: "print_color", name_en: "Color", name_ar: "اللون", type: "SELECT", filterable: true }),
  ],
  tablets: [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "screen_size", name_en: "Screen", name_ar: "الشاشة", type: "RANGE", filterable: true, unit: "inch" }),
    a({ key: "storage", name_en: "Storage", name_ar: "التخزين", type: "SELECT", filterable: true }),
    a({ key: "ram", name_en: "RAM", name_ar: "الرام", type: "SELECT", filterable: true, unit: "GB" }),
  ],
  "smart-home": [
    a({ key: "brand", name_en: "Brand", name_ar: "الماركة", type: "SELECT", filterable: true }),
    a({ key: "device_type", name_en: "Device type", name_ar: "نوع الجهاز", type: "SELECT", filterable: true }),
    a({ key: "wireless", name_en: "Wireless", name_ar: "لاسلكي", type: "BOOLEAN", filterable: true }),
  ],
};
