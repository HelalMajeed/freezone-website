/**
 * Demo catalog seeder — `npm run db:seed:demo` (tsx prisma/seed-demo-products.ts).
 *
 * Separate from `seed.ts` (which wipes and reseeds taxonomy/CMS and seeds ZERO
 * products — see ASSUMPTIONS.md A-7). This script is:
 *   - additive + idempotent: products upsert by unique `slug`, brands by `slug`,
 *     images are replaced per product — rerunning yields identical counts;
 *   - non-production: refuses NODE_ENV=production unless DEMO_SEED_FORCE=true;
 *   - self-contained: generates branded placeholder WebP images with `sharp`
 *     into `public/uploads/demo/` (git-tracked) when missing, referenced as
 *     `/uploads/demo/...` like real admin uploads.
 *
 * Requires categories to exist (run `prisma db seed` first); missing ones are
 * created from `src/lib/data.ts` as a fallback so the script never half-seeds.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { CATEGORIES } from "../src/lib/data";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(__dirname, "..", "public", "uploads", "demo");
const IMAGE_SIZES = [800, 400, 200] as const;

interface DemoBrand {
  slug: string;
  nameEn: string;
  nameAr: string;
}

interface DemoProduct {
  slug: string;
  cat: string;
  brand: string;
  /** Links the Brand row when it is one of DEMO_BRANDS. */
  brandSlug?: string;
  nameEn: string;
  nameAr: string;
  shortDescEn: string;
  shortDescAr: string;
  descEn: string;
  descAr: string;
  specs: Record<string, string>;
  /** Charged price (integer IQD). `oldPrice` = compare-at, `salePrice` mirrors the discount. */
  price: number;
  oldPrice?: number;
  salePrice?: number;
  featured?: boolean;
  isNew?: boolean;
  quantity: number;
  warranty: string;
  sku: string;
  /** Accent color for the generated placeholder image. */
  color: string;
}

const DEMO_BRANDS: DemoBrand[] = [
  { slug: "asus", nameEn: "ASUS", nameAr: "أسوس" },
  { slug: "msi", nameEn: "MSI", nameAr: "إم إس آي" },
  { slug: "hp", nameEn: "HP", nameAr: "إتش بي" },
  { slug: "lenovo", nameEn: "Lenovo", nameAr: "لينوفو" },
  { slug: "apple", nameEn: "Apple", nameAr: "آبل" },
  { slug: "logitech", nameEn: "Logitech", nameAr: "لوجيتك" },
  { slug: "samsung", nameEn: "Samsung", nameAr: "سامسونج" },
  { slug: "tp-link", nameEn: "TP-Link", nameAr: "تي بي لينك" },
  { slug: "hikvision", nameEn: "Hikvision", nameAr: "هيك فيجن" },
  { slug: "anker", nameEn: "Anker", nameAr: "أنكر" },
];

const WARRANTY_2Y = "ضمان سنتين وكالة — 2-year warranty";
const WARRANTY_1Y = "ضمان سنة وكالة — 1-year warranty";

const DEMO_PRODUCTS: DemoProduct[] = [
  // ── Laptops ────────────────────────────────────────────────────────────────
  {
    slug: "asus-rog-strix-g16-rtx4060",
    cat: "laptops",
    brand: "ASUS",
    brandSlug: "asus",
    nameEn: "ASUS ROG Strix G16 — i7-13650HX / RTX 4060 / 16GB / 1TB",
    nameAr: "أسوس ROG Strix G16 — معالج i7-13650HX وكرت RTX 4060 ورام 16GB وتخزين 1TB",
    shortDescEn: "16\" FHD+ 165Hz gaming laptop with RTX 4060 graphics.",
    shortDescAr: "لابتوب ألعاب 16 بوصة بمعدل تحديث 165Hz وكرت شاشة RTX 4060.",
    descEn:
      "The ROG Strix G16 pairs a 13th-gen Intel Core i7 with NVIDIA GeForce RTX 4060 graphics and a 165Hz FHD+ display. 16GB DDR5 memory and a 1TB NVMe SSD keep modern titles and creator workloads fast.",
    descAr:
      "يجمع ROG Strix G16 بين معالج إنتل كور i7 من الجيل الثالث عشر وكرت شاشة NVIDIA GeForce RTX 4060 مع شاشة FHD+‎ بمعدل تحديث 165Hz. ذاكرة 16GB DDR5 وقرص NVMe سعة 1TB يضمنان أداءً سريعاً للألعاب الحديثة وأعمال المونتاج.",
    specs: {
      cpu: "Intel Core i7-13650HX (14 cores)",
      gpu: "NVIDIA GeForce RTX 4060 8GB",
      ram: "16GB DDR5 4800MHz",
      storage: "1TB NVMe PCIe 4.0 SSD",
      screen: "16\" FHD+ 1920×1200 165Hz",
      os: "Windows 11 Home",
    },
    price: 2_150_000,
    oldPrice: 2_350_000,
    salePrice: 2_150_000,
    featured: true,
    quantity: 8,
    warranty: WARRANTY_2Y,
    sku: "FZ-LT-0001",
    color: "#DC2626",
  },
  {
    slug: "lenovo-ideapad-slim-5-ryzen7",
    cat: "laptops",
    brand: "Lenovo",
    brandSlug: "lenovo",
    nameEn: "Lenovo IdeaPad Slim 5 — Ryzen 7 7730U / 16GB / 512GB",
    nameAr: "لينوفو IdeaPad Slim 5 — معالج Ryzen 7 7730U ورام 16GB وتخزين 512GB",
    shortDescEn: "Light 14\" everyday laptop for work and study.",
    shortDescAr: "لابتوب خفيف 14 بوصة للعمل والدراسة اليومية.",
    descEn:
      "A slim aluminium 14-inch laptop with AMD Ryzen 7 performance, 16GB of RAM and a fast 512GB SSD — all-day battery for office, browsing and online classes.",
    descAr:
      "لابتوب نحيف بهيكل ألمنيوم وشاشة 14 بوصة مع أداء معالج AMD Ryzen 7 ورام 16GB وقرص SSD سريع بسعة 512GB — بطارية تدوم طوال اليوم للمكتب والتصفح والدروس عبر الإنترنت.",
    specs: {
      cpu: "AMD Ryzen 7 7730U (8 cores)",
      ram: "16GB LPDDR4x",
      storage: "512GB NVMe SSD",
      screen: "14\" WUXGA 1920×1200 IPS",
      os: "Windows 11 Home",
    },
    price: 1_050_000,
    isNew: true,
    quantity: 15,
    warranty: WARRANTY_2Y,
    sku: "FZ-LT-0002",
    color: "#0369A1",
  },
  {
    slug: "hp-victus-15-rtx4050",
    cat: "gaming-laptops",
    brand: "HP",
    brandSlug: "hp",
    nameEn: "HP Victus 15 — i5-13420H / RTX 4050 / 16GB / 512GB",
    nameAr: "إتش بي Victus 15 — معالج i5-13420H وكرت RTX 4050 ورام 16GB وتخزين 512GB",
    shortDescEn: "Entry gaming laptop with 144Hz display.",
    shortDescAr: "لابتوب ألعاب اقتصادي بشاشة 144Hz.",
    descEn:
      "Victus 15 brings RTX 4050 graphics and a 144Hz FHD panel to an affordable price point — a solid first gaming laptop that also handles study and office work.",
    descAr:
      "يقدّم Victus 15 كرت شاشة RTX 4050 وشاشة FHD بمعدل 144Hz بسعر مناسب — خيار ممتاز كأول لابتوب ألعاب ويؤدي مهام الدراسة والمكتب بسهولة.",
    specs: {
      cpu: "Intel Core i5-13420H",
      gpu: "NVIDIA GeForce RTX 4050 6GB",
      ram: "16GB DDR4 3200MHz",
      storage: "512GB NVMe SSD",
      screen: "15.6\" FHD 144Hz",
    },
    price: 1_420_000,
    oldPrice: 1_550_000,
    salePrice: 1_420_000,
    quantity: 12,
    warranty: WARRANTY_2Y,
    sku: "FZ-LT-0003",
    color: "#0369A1",
  },
  // ── Monitors ───────────────────────────────────────────────────────────────
  {
    slug: "samsung-odyssey-g5-27-165hz",
    cat: "monitors",
    brand: "Samsung",
    brandSlug: "samsung",
    nameEn: "Samsung Odyssey G5 27\" QHD 165Hz Curved Gaming Monitor",
    nameAr: "شاشة سامسونج Odyssey G5 منحنية 27 بوصة QHD بمعدل 165Hz",
    shortDescEn: "1000R curved QHD panel with 1ms response.",
    shortDescAr: "شاشة منحنية 1000R بدقة QHD واستجابة 1ms.",
    descEn:
      "The Odyssey G5 wraps a 2560×1440 VA panel into an immersive 1000R curve, with 165Hz refresh, 1ms response and FreeSync Premium for tear-free gaming.",
    descAr:
      "تقدّم Odyssey G5 لوحة VA بدقة 2560×1440 وانحناء 1000R غامر، مع معدل تحديث 165Hz واستجابة 1ms وتقنية FreeSync Premium لألعاب دون تقطيع.",
    specs: {
      screen_size: "27 inch",
      resolution: "2560×1440 (QHD)",
      refresh_rate: "165Hz",
      panel_type: "VA, 1000R curved",
      response_time: "1ms (MPRT)",
    },
    price: 520_000,
    featured: true,
    quantity: 10,
    warranty: WARRANTY_2Y,
    sku: "FZ-MN-0001",
    color: "#D97706",
  },
  {
    slug: "msi-pro-mp243-24-fhd",
    cat: "monitors",
    brand: "MSI",
    brandSlug: "msi",
    nameEn: "MSI PRO MP243 24\" FHD IPS Business Monitor",
    nameAr: "شاشة إم إس آي PRO MP243 مكتبية 24 بوصة FHD IPS",
    shortDescEn: "Eye-friendly 75Hz IPS office monitor.",
    shortDescAr: "شاشة مكتبية IPS بمعدل 75Hz مريحة للعين.",
    descEn:
      "A clean 23.8-inch IPS display for office and home use with 75Hz refresh, anti-flicker and low blue light certification — HDMI and DisplayPort inputs included.",
    descAr:
      "شاشة IPS أنيقة بحجم 23.8 بوصة للمكتب والمنزل بمعدل تحديث 75Hz مع تقنيات منع الوميض وتقليل الضوء الأزرق — مداخل HDMI وDisplayPort.",
    specs: {
      screen_size: "23.8 inch",
      resolution: "1920×1080 (FHD)",
      refresh_rate: "75Hz",
      panel_type: "IPS",
    },
    price: 185_000,
    quantity: 25,
    warranty: WARRANTY_1Y,
    sku: "FZ-MN-0002",
    color: "#D97706",
  },
  // ── Gaming ─────────────────────────────────────────────────────────────────
  {
    slug: "logitech-g502-hero-mouse",
    cat: "gaming",
    brand: "Logitech",
    brandSlug: "logitech",
    nameEn: "Logitech G502 HERO Gaming Mouse — 25K DPI",
    nameAr: "ماوس ألعاب لوجيتك G502 HERO بدقة 25K DPI",
    shortDescEn: "Legendary shape, HERO 25K sensor, 11 buttons.",
    shortDescAr: "تصميم أسطوري مع حساس HERO 25K و11 زراً قابلاً للبرمجة.",
    descEn:
      "The most popular gaming mouse ever: HERO 25K sensor, 11 programmable buttons, adjustable weights and LIGHTSYNC RGB. Built for FPS and MOBA precision.",
    descAr:
      "أكثر ماوس ألعاب شهرةً على الإطلاق: حساس HERO 25K و11 زراً قابلاً للبرمجة وأوزان قابلة للتعديل وإضاءة LIGHTSYNC RGB. مصمم لدقة ألعاب التصويب والموبا.",
    specs: {
      sensor: "HERO 25K (100–25,600 DPI)",
      buttons: "11 programmable",
      connection_type: "USB wired",
      weight: "121g + 18g adjustable",
    },
    price: 65_000,
    oldPrice: 85_000,
    salePrice: 65_000,
    quantity: 40,
    warranty: WARRANTY_1Y,
    sku: "FZ-GM-0001",
    color: "#DC2626",
  },
  {
    slug: "msi-force-gc30-v2-controller",
    cat: "controllers",
    brand: "MSI",
    brandSlug: "msi",
    nameEn: "MSI Force GC30 V2 Wireless Controller",
    nameAr: "يد تحكم لاسلكية إم إس آي Force GC30 V2",
    shortDescEn: "Wireless PC/Android controller with dual vibration.",
    shortDescAr: "يد تحكم لاسلكية للحاسوب وأندرويد مع اهتزاز مزدوج.",
    descEn:
      "A versatile 2.4GHz wireless controller for PC, Android and popular emulators — dual vibration motors, interchangeable D-pads and a 600mAh rechargeable battery.",
    descAr:
      "يد تحكم لاسلكية 2.4GHz متعددة الاستخدام للحاسوب وأندرويد وأشهر المحاكيات — محركا اهتزاز مزدوجان وأزرار اتجاهات قابلة للتبديل وبطارية 600mAh قابلة للشحن.",
    specs: {
      connection_type: "2.4GHz wireless / USB-C wired",
      battery: "600mAh rechargeable",
      compatibility: "PC, Android, Steam",
    },
    price: 55_000,
    quantity: 0, // intentionally out of stock — exercises OOS UI states
    warranty: WARRANTY_1Y,
    sku: "FZ-GM-0002",
    color: "#DC2626",
  },
  // ── Computers ──────────────────────────────────────────────────────────────
  {
    slug: "freezone-creator-pc-i7-rtx4070",
    cat: "desktops-builds",
    brand: "FreeZone Build",
    nameEn: "FreeZone Creator PC — i7-14700F / RTX 4070 Super / 32GB / 2TB",
    nameAr: "حاسوب FreeZone للمبدعين — معالج i7-14700F وكرت RTX 4070 Super ورام 32GB وتخزين 2TB",
    shortDescEn: "Pre-built workstation for gaming, editing and 3D.",
    shortDescAr: "حاسوب مجهّز مسبقاً للألعاب والمونتاج والتصميم ثلاثي الأبعاد.",
    descEn:
      "Assembled and stress-tested in our Baghdad workshop: Intel i7-14700F, RTX 4070 Super 12GB, 32GB DDR5 and a 2TB NVMe SSD in an airflow case — ready for 1440p gaming and heavy creator workloads.",
    descAr:
      "مجمّع ومختبر تحت الضغط في ورشتنا ببغداد: معالج إنتل i7-14700F وكرت RTX 4070 Super بذاكرة 12GB ورام 32GB DDR5 وقرص NVMe بسعة 2TB داخل صندوق بتهوية ممتازة — جاهز لألعاب 1440p وأعمال الإنتاج الثقيلة.",
    specs: {
      cpu: "Intel Core i7-14700F (20 cores)",
      gpu: "NVIDIA GeForce RTX 4070 Super 12GB",
      ram: "32GB DDR5 6000MHz (2×16GB)",
      storage: "2TB NVMe PCIe 4.0 SSD",
      psu: "750W 80+ Gold",
    },
    price: 2_850_000,
    featured: true,
    quantity: 5,
    warranty: WARRANTY_2Y,
    sku: "FZ-PC-0001",
    color: "#059669",
  },
  {
    slug: "lenovo-thinkcentre-neo-50t",
    cat: "computers",
    brand: "Lenovo",
    brandSlug: "lenovo",
    nameEn: "Lenovo ThinkCentre Neo 50t — i5-13400 / 8GB / 512GB",
    nameAr: "لينوفو ThinkCentre Neo 50t — معالج i5-13400 ورام 8GB وتخزين 512GB",
    shortDescEn: "Reliable tower PC for offices and POS.",
    shortDescAr: "حاسوب مكتبي موثوق للشركات ونقاط البيع.",
    descEn:
      "A dependable business tower with 13th-gen Intel performance, easy serviceability and Lenovo's commercial-grade reliability — ideal for accounting, POS and office fleets.",
    descAr:
      "حاسوب مكتبي موثوق للأعمال بأداء معالجات إنتل الجيل الثالث عشر وسهولة في الصيانة وجودة لينوفو التجارية — مثالي للمحاسبة ونقاط البيع وأساطيل المكاتب.",
    specs: {
      cpu: "Intel Core i5-13400",
      ram: "8GB DDR4 (expandable)",
      storage: "512GB NVMe SSD",
      os: "Windows 11 Pro",
    },
    price: 780_000,
    quantity: 14,
    warranty: WARRANTY_2Y,
    sku: "FZ-PC-0002",
    color: "#059669",
  },
  // ── All-in-One ─────────────────────────────────────────────────────────────
  {
    slug: "hp-proone-440-aio-24",
    cat: "all-in-one",
    brand: "HP",
    brandSlug: "hp",
    nameEn: "HP ProOne 440 G9 23.8\" All-in-One — i5 / 16GB / 512GB",
    nameAr: "إتش بي ProOne 440 G9 الكل في واحد 23.8 بوصة — معالج i5 ورام 16GB وتخزين 512GB",
    shortDescEn: "Space-saving FHD all-in-one with webcam.",
    shortDescAr: "جهاز الكل في واحد بشاشة FHD وكاميرا مدمجة يوفّر المساحة.",
    descEn:
      "Desk-friendly all-in-one with a 23.8\" FHD display, 12th-gen Core i5, pop-up privacy webcam and tool-free upgrades — one cable to power the whole desk.",
    descAr:
      "جهاز الكل في واحد عملي بشاشة FHD حجم 23.8 بوصة ومعالج كور i5 الجيل الثاني عشر وكاميرا خصوصية منبثقة وترقية دون أدوات — كابل واحد يشغّل المكتب كله.",
    specs: {
      cpu: "Intel Core i5-12500T",
      ram: "16GB DDR4",
      storage: "512GB NVMe SSD",
      screen: "23.8\" FHD IPS",
    },
    price: 1_150_000,
    quantity: 7,
    warranty: WARRANTY_2Y,
    sku: "FZ-AI-0001",
    color: "#0EA5E9",
  },
  // ── Phones ─────────────────────────────────────────────────────────────────
  {
    slug: "samsung-galaxy-s24-256gb",
    cat: "phones",
    brand: "Samsung",
    brandSlug: "samsung",
    nameEn: "Samsung Galaxy S24 — 8GB / 256GB",
    nameAr: "سامسونج جالكسي S24 — رام 8GB وتخزين 256GB",
    shortDescEn: "Compact AI flagship with 50MP camera.",
    shortDescAr: "هاتف رائد مدمج بكاميرا 50MP وميزات الذكاء الاصطناعي.",
    descEn:
      "Galaxy AI on a brilliant 6.2\" 120Hz display: 50MP main camera, all-day 4000mAh battery and seven years of OS updates in a pocketable flagship body.",
    descAr:
      "ذكاء جالكسي الاصطناعي على شاشة رائعة 6.2 بوصة بمعدل 120Hz: كاميرا رئيسية 50MP وبطارية 4000mAh تدوم طوال اليوم وسبع سنوات من تحديثات النظام بهيكل رائد صغير الحجم.",
    specs: {
      chipset_full: "Exynos 2400",
      ram_display: "8GB",
      storage_display: "256GB",
      display_full: "6.2\" FHD+ AMOLED 120Hz",
      camera_full: "50MP + 12MP + 10MP",
      battery_full: "4000mAh, 25W charging",
    },
    price: 1_250_000,
    featured: true,
    isNew: true,
    quantity: 18,
    warranty: WARRANTY_1Y,
    sku: "FZ-PH-0001",
    color: "#6366F1",
  },
  {
    slug: "apple-iphone-15-128gb",
    cat: "phones",
    brand: "Apple",
    brandSlug: "apple",
    nameEn: "Apple iPhone 15 — 128GB",
    nameAr: "آبل آيفون 15 — تخزين 128GB",
    shortDescEn: "Dynamic Island, 48MP camera, USB-C.",
    shortDescAr: "جزيرة ديناميكية وكاميرا 48MP ومنفذ USB-C.",
    descEn:
      "iPhone 15 brings the Dynamic Island, a 48MP main camera with 2x optical-quality zoom and USB-C — powered by the A16 Bionic chip.",
    descAr:
      "يقدّم آيفون 15 الجزيرة الديناميكية وكاميرا رئيسية 48MP بتقريب بجودة بصرية 2x ومنفذ USB-C — بمعالج A16 Bionic.",
    specs: {
      chipset_full: "Apple A16 Bionic",
      storage_display: "128GB",
      display_full: "6.1\" Super Retina XDR OLED",
      camera_full: "48MP + 12MP",
    },
    price: 1_350_000,
    quantity: 9,
    warranty: WARRANTY_1Y,
    sku: "FZ-PH-0002",
    color: "#6366F1",
  },
  // ── Tablets ────────────────────────────────────────────────────────────────
  {
    slug: "apple-ipad-10th-gen-64gb",
    cat: "tablets",
    brand: "Apple",
    brandSlug: "apple",
    nameEn: "Apple iPad 10th Gen 10.9\" — Wi-Fi 64GB",
    nameAr: "آبل آيباد الجيل العاشر 10.9 بوصة — واي فاي وتخزين 64GB",
    shortDescEn: "All-screen iPad with A14 Bionic.",
    shortDescAr: "آيباد بشاشة كاملة ومعالج A14 Bionic.",
    descEn:
      "The reimagined iPad with a 10.9\" Liquid Retina display, A14 Bionic chip, landscape front camera and four fun colors — perfect for study, drawing and streaming.",
    descAr:
      "آيباد بتصميم جديد كلياً مع شاشة Liquid Retina حجم 10.9 بوصة ومعالج A14 Bionic وكاميرا أمامية أفقية — مثالي للدراسة والرسم ومشاهدة المحتوى.",
    specs: {
      chipset_full: "Apple A14 Bionic",
      storage_display: "64GB",
      display_full: "10.9\" Liquid Retina",
      cellularNetwork: "Wi-Fi only",
    },
    price: 620_000,
    quantity: 11,
    warranty: WARRANTY_1Y,
    sku: "FZ-TB-0001",
    color: "#9333EA",
  },
  // ── CCTV ───────────────────────────────────────────────────────────────────
  {
    slug: "hikvision-ds-2ce76d0t-2mp-dome",
    cat: "cctv",
    brand: "Hikvision",
    brandSlug: "hikvision",
    nameEn: "Hikvision DS-2CE76D0T 2MP Indoor Dome Camera",
    nameAr: "كاميرا هيك فيجن DS-2CE76D0T داخلية دوم بدقة 2MP",
    shortDescEn: "1080p dome camera with 20m IR night vision.",
    shortDescAr: "كاميرا دوم بدقة 1080p ورؤية ليلية حتى 20 متراً.",
    descEn:
      "A dependable 2MP Turbo HD dome for shops and homes: smart IR up to 20m, wide 2.8mm lens and a vandal-aware housing — works with any Hikvision DVR.",
    descAr:
      "كاميرا دوم Turbo HD موثوقة بدقة 2MP للمحلات والمنازل: أشعة تحت حمراء ذكية حتى 20 متراً وعدسة واسعة 2.8mm وهيكل مقاوم للعبث — تعمل مع أي جهاز DVR من هيك فيجن.",
    specs: {
      imagingQuality: "2MP 1920×1080",
      lensFocalMm: "2.8 mm",
      nightVisionMeters: "20 m IR",
      cameraColorMode: "IR night vision",
    },
    price: 38_000,
    quantity: 60,
    warranty: WARRANTY_2Y,
    sku: "FZ-CC-0001",
    color: "#7C3AED",
  },
  {
    slug: "hikvision-7208-dvr-kit-8ch",
    cat: "dvr-nvr",
    brand: "Hikvision",
    brandSlug: "hikvision",
    nameEn: "Hikvision 8-Channel DVR Kit — 4× 2MP Cameras + 1TB HDD",
    nameAr: "طقم هيك فيجن DVR ثماني قنوات — 4 كاميرات 2MP وقرص 1TB",
    shortDescEn: "Complete 8ch surveillance kit, ready to install.",
    shortDescAr: "منظومة مراقبة كاملة بثماني قنوات جاهزة للتركيب.",
    descEn:
      "Everything to secure a home or shop in one box: an 8-channel Turbo HD DVR, four 2MP outdoor cameras, a surveillance-grade 1TB hard disk, cabling and power supplies.",
    descAr:
      "كل ما تحتاجه لحماية منزلك أو محلك في صندوق واحد: جهاز DVR ثماني قنوات وأربع كاميرات خارجية 2MP وقرص مراقبة 1TB مع الكوابل ومحولات الطاقة.",
    specs: {
      channelCount: "8 channels",
      recordingResolution: "1080p Lite",
      storage: "1TB surveillance HDD",
      cameras: "4× 2MP outdoor bullet",
    },
    price: 420_000,
    featured: true,
    quantity: 6,
    warranty: WARRANTY_2Y,
    sku: "FZ-CC-0002",
    color: "#7C3AED",
  },
  // ── Security ───────────────────────────────────────────────────────────────
  {
    slug: "zkteco-f18-fingerprint-access",
    cat: "fingerprint-attendance",
    brand: "ZKTeco",
    nameEn: "ZKTeco F18 Fingerprint Access Control & Time Attendance",
    nameAr: "جهاز بصمة ZKTeco F18 للتحكم بالدخول وتسجيل الدوام",
    shortDescEn: "Fingerprint + RFID door access with attendance logs.",
    shortDescAr: "تحكم بالدخول بالبصمة وبطاقات RFID مع سجلات الدوام.",
    descEn:
      "A proven access terminal for offices: 3,000 fingerprint templates, RFID card support, TCP/IP networking and exportable attendance reports.",
    descAr:
      "جهاز تحكم بالدخول مجرّب للمكاتب: سعة 3000 بصمة ودعم بطاقات RFID واتصال شبكي TCP/IP وتقارير دوام قابلة للتصدير.",
    specs: {
      security_type: "Access control + attendance",
      capacity: "3,000 fingerprints / 30,000 logs",
      connectivity: "TCP/IP, RS485, USB",
    },
    price: 230_000,
    quantity: 13,
    warranty: WARRANTY_1Y,
    sku: "FZ-SC-0001",
    color: "#1D4ED8",
  },
  // ── Networking ─────────────────────────────────────────────────────────────
  {
    slug: "tplink-archer-ax55-wifi6-router",
    cat: "routers",
    brand: "TP-Link",
    brandSlug: "tp-link",
    nameEn: "TP-Link Archer AX55 — AX3000 Wi-Fi 6 Router",
    nameAr: "راوتر تي بي لينك Archer AX55 بتقنية واي فاي 6 وسرعة AX3000",
    shortDescEn: "Dual-band Wi-Fi 6 with OneMesh and WPA3.",
    shortDescAr: "واي فاي 6 ثنائي النطاق مع دعم OneMesh وتشفير WPA3.",
    descEn:
      "Upgrade the whole house to Wi-Fi 6: 2402Mbps on 5GHz + 574Mbps on 2.4GHz, four antennas, OneMesh support and a full gigabit WAN/LAN — handles 100+ devices smoothly.",
    descAr:
      "انقل منزلك بالكامل إلى واي فاي 6: سرعة 2402Mbps على نطاق 5GHz و574Mbps على 2.4GHz مع أربعة هوائيات ودعم OneMesh ومنافذ جيجابت — يدير أكثر من 100 جهاز بسلاسة.",
    specs: {
      product_type: "Router",
      wifi_standard: "Wi-Fi 6 (802.11ax)",
      speed: "AX3000 (2402 + 574 Mbps)",
      ports: "4× Gigabit LAN + 1× Gigabit WAN",
      network_type: "Home",
    },
    price: 145_000,
    oldPrice: 175_000,
    salePrice: 145_000,
    featured: true,
    quantity: 20,
    warranty: WARRANTY_2Y,
    sku: "FZ-NW-0001",
    color: "#0E7490",
  },
  {
    slug: "tplink-ls1008g-8port-switch",
    cat: "switches",
    brand: "TP-Link",
    brandSlug: "tp-link",
    nameEn: "TP-Link LS1008G 8-Port Gigabit Desktop Switch",
    nameAr: "سويتش تي بي لينك LS1008G مكتبي بثمانية منافذ جيجابت",
    shortDescEn: "Plug-and-play unmanaged gigabit switch.",
    shortDescAr: "سويتش جيجابت غير مُدار يعمل فور التوصيل.",
    descEn:
      "Silent fanless 8-port gigabit switch for desks and racks — auto MDI/MDIX, green power saving and a steel case. No setup needed.",
    descAr:
      "سويتش جيجابت صامت دون مروحة بثمانية منافذ للمكاتب والرفوف — تبديل تلقائي MDI/MDIX وتوفير ذكي للطاقة وهيكل معدني. لا يحتاج أي إعداد.",
    specs: {
      product_type: "Switch",
      speed: "1 Gbps",
      ports: "8× Gigabit RJ45",
      network_type: "Home",
    },
    price: 45_000,
    quantity: 35,
    warranty: WARRANTY_1Y,
    sku: "FZ-NW-0002",
    color: "#0E7490",
  },
  {
    slug: "ubiquiti-unifi-ac-lite-ap",
    cat: "access-points",
    brand: "Ubiquiti",
    nameEn: "Ubiquiti UniFi AC Lite Access Point",
    nameAr: "نقطة وصول يوبيكويتي UniFi AC Lite",
    shortDescEn: "Ceiling AP for offices, cafés and homes.",
    shortDescAr: "نقطة وصول سقفية للمكاتب والمقاهي والمنازل.",
    descEn:
      "Enterprise-grade dual-band 802.11ac access point with PoE power and central management through the UniFi controller — clean roaming across multiple APs.",
    descAr:
      "نقطة وصول ثنائية النطاق بمعيار 802.11ac بجودة الشركات مع تغذية PoE وإدارة مركزية عبر متحكم UniFi — تجوال سلس بين عدة نقاط وصول.",
    specs: {
      product_type: "Access Point",
      wifi_standard: "Wi-Fi 5 (802.11ac)",
      speed: "867 + 300 Mbps",
      network_type: "Enterprise",
    },
    price: 165_000,
    quantity: 16,
    warranty: WARRANTY_1Y,
    sku: "FZ-NW-0003",
    color: "#0E7490",
  },
  // ── Components ─────────────────────────────────────────────────────────────
  {
    slug: "samsung-980-nvme-1tb",
    cat: "components",
    brand: "Samsung",
    brandSlug: "samsung",
    nameEn: "Samsung 980 NVMe M.2 SSD — 1TB",
    nameAr: "قرص سامسونج 980 NVMe M.2 بسعة 1TB",
    shortDescEn: "3,500MB/s PCIe 3.0 SSD for instant load times.",
    shortDescAr: "قرص PCIe 3.0 بسرعة 3500MB/s لتحميل فوري.",
    descEn:
      "Give any PC a serious speed boost: up to 3,500MB/s reads, smart thermal control and Samsung Magician software for health monitoring — 5-year limited warranty class.",
    descAr:
      "امنح أي حاسوب دفعة سرعة حقيقية: قراءة حتى 3500MB/s وتحكم حراري ذكي وبرنامج Samsung Magician لمراقبة صحة القرص.",
    specs: {
      component_type: "Storage",
      capacity: "1TB",
      storage_type: "NVMe SSD",
      interface: "PCIe 3.0 ×4, M.2 2280",
      read_speed: "3,500 MB/s",
    },
    price: 145_000,
    oldPrice: 165_000,
    salePrice: 145_000,
    quantity: 30,
    warranty: WARRANTY_2Y,
    sku: "FZ-CP-0001",
    color: "#4B5563",
  },
  {
    slug: "msi-mag-b650-tomahawk",
    cat: "components",
    brand: "MSI",
    brandSlug: "msi",
    nameEn: "MSI MAG B650 Tomahawk WiFi — AM5 Motherboard",
    nameAr: "لوحة أم إم إس آي MAG B650 Tomahawk WiFi بمقبس AM5",
    shortDescEn: "AM5 board with DDR5, PCIe 4.0 and Wi-Fi 6E.",
    shortDescAr: "لوحة AM5 بدعم DDR5 وPCIe 4.0 وواي فاي 6E.",
    descEn:
      "A battle-proven home for Ryzen 7000/9000: strong 14+2+1 power stages, DDR5 up to 7200MHz, dual PCIe 4.0 M.2 slots, 2.5G LAN and Wi-Fi 6E.",
    descAr:
      "قاعدة مجرّبة لمعالجات Ryzen 7000/9000: مراحل طاقة قوية 14+2+1 ودعم DDR5 حتى 7200MHz وفتحتا M.2 بمعيار PCIe 4.0 وشبكة 2.5G وواي فاي 6E.",
    specs: {
      component_type: "Motherboard",
      socket: "AM5",
      chipset: "AMD B650",
      ram_type: "DDR5 (4 DIMM)",
      form_factor: "ATX",
    },
    price: 320_000,
    quantity: 9,
    warranty: WARRANTY_2Y,
    sku: "FZ-CP-0002",
    color: "#4B5563",
  },
  // ── Accessories ────────────────────────────────────────────────────────────
  {
    slug: "logitech-mx-keys-s-keyboard",
    cat: "accessories",
    brand: "Logitech",
    brandSlug: "logitech",
    nameEn: "Logitech MX Keys S Wireless Keyboard — AR/EN",
    nameAr: "لوحة مفاتيح لوجيتك MX Keys S اللاسلكية — عربي/إنجليزي",
    shortDescEn: "Low-profile backlit keys, multi-device pairing.",
    shortDescAr: "مفاتيح منخفضة بإضاءة خلفية واقتران بعدة أجهزة.",
    descEn:
      "Type on glass-smooth backlit keys with smart illumination, pair with three devices over Bluetooth or the Logi Bolt receiver, and recharge over USB-C — Arabic/English layout.",
    descAr:
      "اكتب على مفاتيح ناعمة بإضاءة خلفية ذكية واقرنها مع ثلاثة أجهزة عبر البلوتوث أو مستقبل Logi Bolt واشحنها عبر USB-C — بتخطيط عربي/إنجليزي.",
    specs: {
      connection_type: "Bluetooth / Logi Bolt",
      battery: "10 days (backlit) / 5 months (off)",
      layout: "Arabic / English",
    },
    price: 165_000,
    quantity: 22,
    warranty: WARRANTY_1Y,
    sku: "FZ-AC-0001",
    color: "#8B5CF6",
  },
  {
    slug: "anker-usb-c-hub-7in1",
    cat: "accessories",
    brand: "Anker",
    brandSlug: "anker",
    nameEn: "Anker 341 USB-C Hub — 7-in-1 (4K HDMI, 100W PD)",
    nameAr: "موزع أنكر 341 USB-C — 7 في 1 (HDMI 4K وشحن 100W)",
    shortDescEn: "HDMI, USB-A/C, SD and 100W pass-through.",
    shortDescAr: "منافذ HDMI وUSB-A/C وقارئ SD وشحن عابر 100W.",
    descEn:
      "One compact hub for the whole desk: 4K@30Hz HDMI, two USB-A and one USB-C data ports, SD/microSD readers and 85W laptop pass-through charging.",
    descAr:
      "موزع صغير يغني عن كل الوصلات: HDMI بدقة 4K@30Hz ومنفذا USB-A ومنفذ USB-C للبيانات وقارئا SD/microSD وشحن عابر للابتوب حتى 85W.",
    specs: {
      connection_type: "USB-C",
      ports_full: "HDMI 4K, 2× USB-A 3.0, USB-C data, SD, microSD, USB-C PD",
      compatibility: "Windows / macOS / iPad",
    },
    price: 75_000,
    isNew: true,
    quantity: 28,
    warranty: WARRANTY_1Y,
    sku: "FZ-AC-0002",
    color: "#8B5CF6",
  },
  // ── Printers ───────────────────────────────────────────────────────────────
  {
    slug: "hp-laserjet-m141a-mfp",
    cat: "printers",
    brand: "HP",
    brandSlug: "hp",
    nameEn: "HP LaserJet M141a MFP — Print / Copy / Scan",
    nameAr: "طابعة إتش بي LaserJet M141a متعددة الوظائف — طباعة ونسخ ومسح",
    shortDescEn: "Compact mono laser MFP for small offices.",
    shortDescAr: "طابعة ليزر أحادية مدمجة متعددة الوظائف للمكاتب الصغيرة.",
    descEn:
      "The world's smallest laser MFP in its class: crisp mono prints up to 20ppm, flatbed copying and scanning, and low cost-per-page toner.",
    descAr:
      "أصغر طابعة ليزر متعددة الوظائف في فئتها: طباعة أحادية حادة حتى 20 صفحة بالدقيقة مع نسخ ومسح مسطّح وكلفة منخفضة للصفحة.",
    specs: {
      printer_type: "Laser (mono)",
      printSpeedPpm: "20 ppm",
      functions: "Print / Copy / Scan",
      connectivity: "USB 2.0",
    },
    price: 235_000,
    quantity: 10,
    warranty: WARRANTY_1Y,
    sku: "FZ-PR-0001",
    color: "#DB2777",
  },
  // ── Power solutions ────────────────────────────────────────────────────────
  {
    slug: "apc-bx950-ups",
    cat: "ups",
    brand: "APC",
    nameEn: "APC Back-UPS BX950 — 950VA / 480W",
    nameAr: "مجهز طاقة احتياطي APC Back-UPS BX950 — 950VA / 480W",
    shortDescEn: "Battery backup + surge protection for PCs.",
    shortDescAr: "بطارية احتياطية وحماية من التذبذب للحواسيب.",
    descEn:
      "Ride through outages and unstable mains: 950VA battery backup with AVR, four outlets and replaceable battery — essential protection for PCs, routers and DVRs in Iraq's grid conditions.",
    descAr:
      "تجاوز انقطاعات الكهرباء وتذبذب التيار: مجهز 950VA مع منظم جهد AVR وأربعة مخارج وبطارية قابلة للاستبدال — حماية أساسية للحواسيب والراوترات وأجهزة التسجيل في ظروف الشبكة العراقية.",
    specs: {
      upsVa: "950VA / 480W",
      outletsCount: "4 outlets",
      pureSineWave: "Stepped sine (line-interactive)",
      nominalVoltageV: "230V",
    },
    price: 185_000,
    quantity: 17,
    warranty: WARRANTY_1Y,
    sku: "FZ-PW-0001",
    color: "#CA8A04",
  },
  // ── Smart home ─────────────────────────────────────────────────────────────
  {
    slug: "tplink-tapo-c200-camera",
    cat: "smart-home",
    brand: "TP-Link",
    brandSlug: "tp-link",
    nameEn: "TP-Link Tapo C200 Pan/Tilt Wi-Fi Camera",
    nameAr: "كاميرا تي بي لينك Tapo C200 متحركة بالواي فاي",
    shortDescEn: "1080p indoor camera with night vision and app control.",
    shortDescAr: "كاميرا داخلية 1080p برؤية ليلية وتحكم عبر التطبيق.",
    descEn:
      "Watch home from anywhere: 360° pan / 114° tilt, 1080p video, motion alerts, two-way audio and local microSD recording — all from the free Tapo app.",
    descAr:
      "راقب منزلك من أي مكان: دوران 360° وإمالة 114° وفيديو 1080p وتنبيهات حركة وصوت ثنائي الاتجاه وتسجيل محلي على بطاقة microSD — كل ذلك عبر تطبيق Tapo المجاني.",
    specs: {
      device_type: "Camera",
      resolution: "1080p FHD",
      ecosystem: "Tapo / Google Assistant / Alexa",
      app_control: "Yes",
    },
    price: 55_000,
    isNew: true,
    quantity: 26,
    warranty: WARRANTY_1Y,
    sku: "FZ-SH-0001",
    color: "#14B8A6",
  },
  // ── Electric solutions ─────────────────────────────────────────────────────
  {
    slug: "growatt-5kw-hybrid-inverter",
    cat: "electric",
    brand: "Growatt",
    nameEn: "Growatt SPF 5000 ES — 5kW Off-Grid Solar Inverter",
    nameAr: "انفرتر كروات SPF 5000 ES للطاقة الشمسية 5 كيلوواط",
    shortDescEn: "5kW hybrid inverter with MPPT for home solar.",
    shortDescAr: "انفرتر هجين 5 كيلوواط مع متحكم MPPT للمنظومات المنزلية.",
    descEn:
      "Power a whole household from solar: 5kW pure sine output, built-in 100A MPPT charger, lithium and lead-acid battery support, and parallel capability up to 6 units.",
    descAr:
      "شغّل منزلاً كاملاً من الطاقة الشمسية: خرج 5 كيلوواط بموجة جيبية نقية وشاحن MPPT مدمج 100 أمبير ودعم بطاريات الليثيوم والرصاص وإمكانية التوازي حتى 6 أجهزة.",
    specs: {
      inverterType: "Off-grid hybrid, pure sine",
      panelWattPeakW: "6000W PV max",
      nominalVoltageV: "48V battery bus",
      phaseCount: "Single phase (1Φ)",
    },
    price: 1_450_000,
    quantity: 4,
    warranty: WARRANTY_2Y,
    sku: "FZ-EL-0001",
    color: "#0891B2",
  },
  // ── Software ───────────────────────────────────────────────────────────────
  {
    slug: "kaspersky-plus-1device-1year",
    cat: "software",
    brand: "Kaspersky",
    nameEn: "Kaspersky Plus — 1 Device / 1 Year (Key Card)",
    nameAr: "كاسبرسكي بلس — جهاز واحد لمدة سنة (بطاقة تفعيل)",
    shortDescEn: "Antivirus + VPN + performance tools license.",
    shortDescAr: "رخصة حماية من الفيروسات مع VPN وأدوات تحسين الأداء.",
    descEn:
      "Real-time antivirus, unlimited-speed VPN, payment protection and PC clean-up tools — official 1-device, 1-year activation delivered as a key card.",
    descAr:
      "حماية فورية من الفيروسات وVPN دون حد للسرعة وحماية للمدفوعات وأدوات تنظيف للحاسوب — تفعيل رسمي لجهاز واحد لمدة سنة عبر بطاقة مفتاح.",
    specs: {
      license: "1 device / 1 year",
      platform: "Windows / macOS / Android",
      delivery: "Key card (in-box code)",
    },
    price: 35_000,
    quantity: 50,
    warranty: "تفعيل رسمي مضمون — guaranteed official activation",
    sku: "FZ-SW-0001",
    color: "#65A30D",
  },
  // ── Hardware & Dev ─────────────────────────────────────────────────────────
  {
    slug: "raspberry-pi-5-8gb",
    cat: "hardware",
    brand: "Raspberry Pi",
    nameEn: "Raspberry Pi 5 — 8GB",
    nameAr: "راسبيري باي 5 — رام 8GB",
    shortDescEn: "Quad-core SBC for projects, IoT and labs.",
    shortDescAr: "حاسوب لوحي مصغّر رباعي النواة للمشاريع وإنترنت الأشياء والمختبرات.",
    descEn:
      "The fastest Raspberry Pi yet: 2.4GHz quad-core Cortex-A76, dual 4Kp60 HDMI, PCIe 2.0 and 8GB RAM — the perfect brain for robotics, kiosks and home labs.",
    descAr:
      "أسرع راسبيري باي حتى الآن: معالج رباعي النواة Cortex-A76 بتردد 2.4GHz ومخرجا HDMI بدقة 4Kp60 ومنفذ PCIe 2.0 ورام 8GB — العقل المثالي للروبوتات وأكشاك العرض والمختبرات المنزلية.",
    specs: {
      cpu: "Broadcom BCM2712, 4× Cortex-A76 @ 2.4GHz",
      ram: "8GB LPDDR4X",
      io: "2× micro-HDMI 4Kp60, 2× USB 3.0, GPIO 40-pin",
      connectivity: "Wi-Fi 5, Bluetooth 5.0, Gigabit LAN",
    },
    price: 145_000,
    featured: true,
    isNew: true,
    quantity: 19,
    warranty: WARRANTY_1Y,
    sku: "FZ-HW-0001",
    color: "#F97316",
  },
];

// ─── Placeholder image generation (sharp) ─────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Greedy 2-line wrap so long product names stay legible on the tile. */
function wrapName(name: string, maxChars = 24): string[] {
  const words = name.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && (cur + " " + w).length > maxChars) {
      lines.push(cur);
      cur = w;
      if (lines.length === 2) break;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (lines.length < 2 && cur) lines.push(cur);
  if (lines.length === 2 && cur && lines[1] !== cur) lines[1] = `${lines[1]}…`;
  return lines;
}

function placeholderSvg(p: DemoProduct): string {
  const lines = wrapName(p.nameEn.split("—")[0].trim());
  const textLines = lines
    .map(
      (line, i) =>
        `<text x="400" y="${430 + i * 58}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#f8fafc">${escapeXml(line)}</text>`,
    )
    .join("");
  return `<svg width="800" height="800" viewBox="0 0 800 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1220"/>
      <stop offset="1" stop-color="#141f38"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <rect x="0" y="0" width="800" height="14" fill="${p.color}"/>
  <circle cx="400" cy="280" r="120" fill="${p.color}" opacity="0.18"/>
  <circle cx="400" cy="280" r="78" fill="${p.color}" opacity="0.30"/>
  <text x="400" y="300" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="800" fill="#f8fafc">${escapeXml(p.brand)}</text>
  ${textLines}
  <text x="400" y="700" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="600" fill="#94a3b8" letter-spacing="6">FREEZONE · DEMO</text>
</svg>`;
}

/** Write the 800/400/200 WebP variants for a product if any are missing. */
async function ensureImages(p: DemoProduct): Promise<{ written: number }> {
  let written = 0;
  const svg = Buffer.from(placeholderSvg(p));
  for (const size of IMAGE_SIZES) {
    const file = path.join(DEMO_DIR, `${p.slug}-${size}.webp`);
    if (fs.existsSync(file)) continue;
    await sharp(svg).resize(size, size).webp({ quality: 82 }).toFile(file);
    written++;
  }
  return { written };
}

// ─── Seeding ──────────────────────────────────────────────────────────────────

async function ensureCategory(slug: string): Promise<number> {
  const existing = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing.id;
  const def = CATEGORIES.find((c) => c.id === slug);
  if (!def) throw new Error(`Demo seed: unknown category slug "${slug}" (not in src/lib/data.ts)`);
  /** Child categories link to their parent — create/find the parent first. */
  const parentId = def.parent ? await ensureCategory(def.parent) : null;
  const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
  const created = await prisma.category.create({
    data: {
      slug: def.id,
      nameEn: def.name,
      nameAr: def.nameAr ?? def.name,
      icon: def.icon,
      color: def.color,
      parentId,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
    select: { id: true },
  });
  console.log(`  + created missing category "${slug}" (run prisma db seed for full taxonomy)`);
  return created.id;
}

async function main() {
  /** Demo data must never land in the production catalog by accident. */
  if (process.env.NODE_ENV === "production" && process.env.DEMO_SEED_FORCE !== "true") {
    console.error(
      "Refusing to seed demo products: NODE_ENV=production.\n" +
        "Set DEMO_SEED_FORCE=true to override intentionally.",
    );
    process.exit(1);
  }

  fs.mkdirSync(DEMO_DIR, { recursive: true });

  const brandIdBySlug = new Map<string, number>();
  for (let i = 0; i < DEMO_BRANDS.length; i++) {
    const b = DEMO_BRANDS[i];
    const row = await prisma.brand.upsert({
      where: { slug: b.slug },
      update: { nameEn: b.nameEn, nameAr: b.nameAr },
      create: { slug: b.slug, nameEn: b.nameEn, nameAr: b.nameAr, sortOrder: i },
      select: { id: true },
    });
    brandIdBySlug.set(b.slug, row.id);
  }

  const categoryIdBySlug = new Map<string, number>();
  let imagesWritten = 0;

  for (const p of DEMO_PRODUCTS) {
    if (!categoryIdBySlug.has(p.cat)) categoryIdBySlug.set(p.cat, await ensureCategory(p.cat));
    const categoryId = categoryIdBySlug.get(p.cat)!;

    imagesWritten += (await ensureImages(p)).written;

    const inStock = p.quantity > 0;
    const data = {
      categoryId,
      brand: p.brand,
      brandId: p.brandSlug ? (brandIdBySlug.get(p.brandSlug) ?? null) : null,
      nameEn: p.nameEn,
      nameAr: p.nameAr,
      shortDescEn: p.shortDescEn,
      shortDescAr: p.shortDescAr,
      descEn: p.descEn,
      descAr: p.descAr,
      specs: p.specs,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      salePrice: p.salePrice ?? null,
      quantity: p.quantity,
      inStock,
      availability: inStock ? ("IN_STOCK" as const) : ("OUT_OF_STOCK" as const),
      catalogStatus: "PUBLISHED" as const,
      published: true,
      featured: p.featured ?? false,
      isNew: p.isNew ?? false,
      warranty: p.warranty,
      sku: p.sku,
      icon: CATEGORIES.find((c) => c.id === p.cat)?.icon ?? "📦",
    };

    const product = await prisma.product.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
      select: { id: true },
    });

    /** Replace (not append) image rows so reruns keep counts identical. */
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `/uploads/demo/${p.slug}-800.webp`,
        urlW800: `/uploads/demo/${p.slug}-800.webp`,
        urlW400: `/uploads/demo/${p.slug}-400.webp`,
        urlW200: `/uploads/demo/${p.slug}-200.webp`,
        altTextEn: p.nameEn,
        altTextAr: p.nameAr,
        sortOrder: 0,
        isCover: true,
      },
    });
  }

  const [productCount, imageCount, brandCount] = await Promise.all([
    prisma.product.count({ where: { slug: { in: DEMO_PRODUCTS.map((p) => p.slug) } } }),
    prisma.productImage.count({ where: { url: { startsWith: "/uploads/demo/" } } }),
    prisma.brand.count({ where: { slug: { in: DEMO_BRANDS.map((b) => b.slug) } } }),
  ]);
  console.log(
    `Demo seed completed: ${productCount} products (${DEMO_PRODUCTS.length} defined), ` +
      `${imageCount} image rows, ${brandCount} brands, ${imagesWritten} image files written.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
