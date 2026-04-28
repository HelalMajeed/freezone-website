import { FACET_KEY_TO_LABEL } from "./productFacetConfig";
import enMessages from "@/messages/en.json";

/** عناوين حقول المواصفات في لوحة الإدارة (عربي) — المفتاح يطابق facetKeys والـ specs */
export const FACET_ADMIN_LABEL_AR: Record<string, string> = {
  model: "رقم الموديل / SKU",
  // —— Compute & OS ——
  cpu: "المعالج (CPU)",
  gpu: "كرت الشاشة (GPU)",
  ram: "الذاكرة (RAM)",
  vram: "ذاكرة كرت الشاشة (VRAM)",
  os: "نظام التشغيل",
  storage: "سعة التخزين",
  storageType: "نوع التخزين (SSD/HDD)",
  mbFormFactor: "حجم اللوحة الأم (ATX/mATX/ITX)",
  socketType: "قاعدة المعالج (Socket)",
  psuWattage: "قدرة مزود الطاقة (واط)",

  // —— Displays ——
  screen: "شاشة",
  screenSize: "مقاس الشاشة",
  refreshRate: "معدل التحديث",
  resolution: "دقة الشاشة / التسجيل",
  panelType: "نوع اللوحة (IPS/VA/OLED)",
  touchscreen: "شاشة لمس (نعم/لا)",

  // —— Print & scan ——
  paperType: "نوع الورق (A4/رول/ملصقات…)",
  printColor: "طباعة ملونة / أبيض وأسود",
  printTechnology: "تقنية الطباعة (ليزر/نافثة/حراري)",
  printSpeedPpm: "سرعة الطباعة (صفحة/دقيقة)",
  duplexPrinting: "طباعة وجهين (نعم/لا)",
  scanResolution: "دقة المسح الضوئي (DPI)",
  connectivityPrinter: "اتصال الطابعة (USB/Wi‑Fi/Ethernet)",

  // —— CCTV & cameras ——
  imagingQuality: "جودة الصورة والدقة (مثال 2MP، 1920×1080)",
  cameraColorMode: "كاميرا ملونة كاملة / ليلي أبيض وأسود",
  viewingAngleDeg: "زاوية الرؤية (درجة)",
  nightVisionMeters: "مدى الإضاءة تحت الحمراء / الرؤية الليلية (م، مثال حتى 20م)",
  ipRating: "مقاومة الماء والغبار (مثال IP67)",
  lensType: "نوع العدسة (ثابتة / فاريفوكل)",
  lensFocalMm: "بعد بؤري ثابت للعدسة (مثال 2.8 مم / 3.6 مم)",
  poeSupport: "دعم PoE (نعم/لا)",
  recordingResolution: "دقة التسجيل (مثال 4K)",
  hybridVideoSignals: "إشارات فيديو قابلة للتبديل (TVI / AHD / CVI / CVBS)",
  imageSensor: "الحساس والتقنيات (CMOS، WDR، 120 دB…)",
  smartDetection: "كشف ذكي (إنسان/مركبة، عبور خط، تداخل، مناطق…)",

  // —— Security systems ——
  systemType: "نوع النظام (NVR/DVR/تحكم…)",
  channelCount: "عدد القنوات / الكاميرات",

  // —— Smart home ——
  smartProtocol: "بروتوكول (Zigbee / Z‑Wave / Wi‑Fi / Matter)",
  switchCount: "عدد المفاتيح الذكية",
  sensorCount: "عدد الحساسات",
  voiceAssistantCompat: "توافق المساعد الصوتي (Alexa/Google…)",
  smartHubMaxDevices: "أقصى عدد أجهزة على الـ Hub",

  // —— Solar, UPS & power ——
  panelWattPeakW: "قدرة اللوح الشمسي (واط ذروة)",
  solarCellType: "نوع خلايا اللوح (أحادية/متعددة)",
  batteryCapacityKwh: "سعة البطارية (كيلوواط ساعة)",
  batteryCapacityAh: "سعة البطارية (أمبير ساعة)",
  inverterType: "نوع العاكس (سلسلي/هجين/منفصل)",
  nominalVoltageV: "الجهد الاسمي (فولت)",
  phaseCount: "عدد الأطوار (أحادي/ثلاثي)",
  upsVA: "قدرة الـ UPS (VA)",
  pureSineWave: "موجة جيبية نقية (نعم/لا)",
  outletsCount: "عدد المخارج الكهربائية",
  usbPortsPower: "منافذ USB للشحن / عددها",
  efficiencyPercent: "كفاءة (%)",

  // —— Software ——
  licenseType: "نوع الترخيص (دائم/اشتراك)",
  seatCount: "عدد المستخدمين / المقاعد",
  softwarePlatform: "منصة البرنامج (Windows/Web…)",
  subscriptionTerm: "مدة الاشتراك (شهر/سنة)",

  // —— Accessories, sizing & physical ——
  sizeLabel: "مقاس المنتج (مثال 15.6″ / XL)",
  dimensionsMm: "الأبعاد (طول×عرض×ارتفاع مم)",
  weightKg: "الوزن (كغ)",
  cableLengthM: "طول الكابل (م)",
  colorVariant: "اللون / التشطيب",
  material: "المادة",
  compatibilityList: "التوافق مع الأجهزة",
  mountingType: "نوع التثبيت (حائط/مكتب/حامل)",

  // —— Electric & network ——
  wattage: "القدرة (واط)",
  maxCurrentA: "أقصى تيار (أمبير)",
  cableGauge: "مقطع السلك / AWG",
  portCount: "عدد المنافذ (RJ45/USB…)",
  wifiStandard: "معيار Wi‑Fi (5/6/6E)",
  maxSpeedMbps: "أقصى سرعة (Mbps)",

  // —— Audio ——
  audioDriverSize: "حجم السماعة (مم)",
  impedanceOhms: "المقاومة (أوم)",
  batteryLifeHours: "عمر البطارية (ساعات)",

  // —— PC components (generic) ——
  componentType: "نوع المكوّن",
};

const enProducts = (enMessages as { Products: Record<string, string> }).Products;

/** English facet field labels (storefront `Products.facet*` keys) — used for bilingual spec search. */
export const FACET_ADMIN_LABEL_EN: Record<string, string> = Object.fromEntries(
  Object.keys(FACET_ADMIN_LABEL_AR).map((key) => {
    const lk = FACET_KEY_TO_LABEL[key];
    let label = lk ? enProducts[lk] : undefined;
    if (typeof label !== "string") label = key;
    else label = label.replace(/\{\{key\}\}/g, key);
    return [key, label];
  }),
);

export type FacetUiGroup = {
  id: string;
  titleAr: string;
  titleEn: string;
  keys: string[];
};

/** مجموعات للواجهة — تسهيل البحث والاختيار في الإدارة */
export const FACET_UI_GROUPS: FacetUiGroup[] = [
  {
    id: "compute",
    titleAr: "معالجة، ذاكرة، تخزين ونظام",
    titleEn: "Compute, RAM, storage & OS",
    keys: [
      "cpu",
      "gpu",
      "ram",
      "vram",
      "os",
      "storage",
      "storageType",
      "mbFormFactor",
      "socketType",
      "psuWattage",
      "componentType",
    ],
  },
  {
    id: "display",
    titleAr: "شاشات وصورة",
    titleEn: "Displays & video",
    keys: ["screenSize", "refreshRate", "resolution", "panelType", "touchscreen"],
  },
  {
    id: "print",
    titleAr: "طابعات ومسح",
    titleEn: "Printers & scanners",
    keys: [
      "paperType",
      "printColor",
      "printTechnology",
      "printSpeedPpm",
      "duplexPrinting",
      "scanResolution",
      "connectivityPrinter",
    ],
  },
  {
    id: "cctv",
    titleAr: "كاميرات ومراقبة",
    titleEn: "CCTV & cameras",
    keys: [
      "imagingQuality",
      "resolution",
      "recordingResolution",
      "lensFocalMm",
      "lensType",
      "nightVisionMeters",
      "hybridVideoSignals",
      "ipRating",
      "imageSensor",
      "smartDetection",
      "cameraColorMode",
      "viewingAngleDeg",
      "poeSupport",
      "channelCount",
    ],
  },
  {
    id: "security",
    titleAr: "أنظمة أمان وتسجيل",
    titleEn: "Security & recording",
    keys: ["systemType"],
  },
  {
    id: "smarthome",
    titleAr: "منزل ذكي",
    titleEn: "Smart home",
    keys: ["smartProtocol", "switchCount", "sensorCount", "voiceAssistantCompat", "smartHubMaxDevices"],
  },
  {
    id: "power",
    titleAr: "طاقة شمسية، UPS وحلول كهرباء",
    titleEn: "Solar, UPS & power",
    keys: [
      "panelWattPeakW",
      "solarCellType",
      "batteryCapacityKwh",
      "batteryCapacityAh",
      "inverterType",
      "nominalVoltageV",
      "phaseCount",
      "upsVA",
      "pureSineWave",
      "outletsCount",
      "usbPortsPower",
      "efficiencyPercent",
      "wattage",
      "maxCurrentA",
    ],
  },
  {
    id: "software",
    titleAr: "برمجيات وتراخيص",
    titleEn: "Software & licenses",
    keys: ["licenseType", "seatCount", "softwarePlatform", "subscriptionTerm"],
  },
  {
    id: "accessory",
    titleAr: "إكسسوارات، مقاسات ومظهر",
    titleEn: "Accessories, size & finish",
    keys: [
      "model",
      "sizeLabel",
      "dimensionsMm",
      "weightKg",
      "cableLengthM",
      "colorVariant",
      "material",
      "compatibilityList",
      "mountingType",
    ],
  },
  {
    id: "network",
    titleAr: "شبكة وكابلات",
    titleEn: "Network & cabling",
    keys: ["portCount", "wifiStandard", "maxSpeedMbps", "cableGauge"],
  },
  {
    id: "audio",
    titleAr: "صوتيات",
    titleEn: "Audio",
    keys: ["audioDriverSize", "impedanceOhms", "batteryLifeHours"],
  },
];

/** ترتيب عرض المفاتيح في المنتقي: حسب المجموعات ثم أي مفاتيح في القاموس ولم تُدرج في مجموعة */
export function getAllFacetCatalogKeysOrdered(): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const g of FACET_UI_GROUPS) {
    for (const k of g.keys) {
      if (!FACET_ADMIN_LABEL_AR[k] || seen.has(k)) continue;
      seen.add(k);
      ordered.push(k);
    }
  }
  const rest = Object.keys(FACET_ADMIN_LABEL_AR)
    .filter((k) => !seen.has(k))
    .sort((a, b) => a.localeCompare(b));
  return [...ordered, ...rest];
}

export function facetAdminLabelAr(key: string): string {
  const ar = FACET_ADMIN_LABEL_AR[key];
  const en = FACET_ADMIN_LABEL_EN[key];
  if (ar && en && ar !== en) return `${ar} / ${en}`;
  return ar ?? en ?? key;
}

/** UI group (Compute, Smart home, …) that contains this spec key, if any. */
export function getFacetGroupForSpecKey(key: string): FacetUiGroup | null {
  for (const g of FACET_UI_GROUPS) {
    if (g.keys.includes(key)) return g;
  }
  return null;
}
