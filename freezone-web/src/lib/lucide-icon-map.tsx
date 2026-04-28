import { createElement } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Truck,
  ShieldCheck,
  Repeat,
  Headphones,
  Laptop,
  Monitor,
  Gamepad2,
  Cpu,
  Printer,
  Package,
  Star,
  Zap,
  Heart,
  Mouse,
  Keyboard,
  HardDrive,
  Cable,
  Network,
  Router,
  Wifi,
  Server,
  Smartphone,
  Camera,
  ShoppingCart,
  Tv,
  Plug,
  Usb,
  Phone,
  MessageCircle,
  type LucideProps,
} from "lucide-react";

const MAP: Record<string, LucideIcon> = {
  phone: Phone,
  "message-circle": MessageCircle,
  truck: Truck,
  "shield-check": ShieldCheck,
  repeat: Repeat,
  headphones: Headphones,
  laptop: Laptop,
  monitor: Monitor,
  "gamepad-2": Gamepad2,
  gamepad: Gamepad2,
  cpu: Cpu,
  printer: Printer,
  package: Package,
  star: Star,
  zap: Zap,
  heart: Heart,
  mouse: Mouse,
  keyboard: Keyboard,
  "hard-drive": HardDrive,
  cable: Cable,
  network: Network,
  router: Router,
  wifi: Wifi,
  server: Server,
  smartphone: Smartphone,
  camera: Camera,
  "shopping-cart": ShoppingCart,
  tv: Tv,
  plug: Plug,
  usb: Usb,
};

/** خيارات قائمة اختيار الأيقونة في الإدارة (عربي + إنجليزي + المفتاح المحفوظ). */
export const LUCIDE_ICON_PICKER_OPTIONS: readonly { key: string; labelAr: string; labelEn: string }[] = [
  { key: "laptop", labelAr: "لابتوب", labelEn: "Laptop" },
  { key: "monitor", labelAr: "شاشة", labelEn: "Monitor" },
  { key: "gamepad-2", labelAr: "ألعاب / يد تحكم", labelEn: "Gaming" },
  { key: "cpu", labelAr: "معالج / مكوّنات", labelEn: "CPU / Components" },
  { key: "printer", labelAr: "طابعة", labelEn: "Printer" },
  { key: "headphones", labelAr: "سماعات / إكسسوارات", labelEn: "Headphones" },
  { key: "mouse", labelAr: "فأرة", labelEn: "Mouse" },
  { key: "keyboard", labelAr: "لوحة مفاتيح", labelEn: "Keyboard" },
  { key: "hard-drive", labelAr: "تخزين / SSD", labelEn: "Storage" },
  { key: "cable", labelAr: "كابلات", labelEn: "Cables" },
  { key: "network", labelAr: "شبكة", labelEn: "Network" },
  { key: "router", labelAr: "راوتر", labelEn: "Router" },
  { key: "wifi", labelAr: "واي فاي", labelEn: "Wi‑Fi" },
  { key: "server", labelAr: "خادم", labelEn: "Server" },
  { key: "smartphone", labelAr: "هاتف", labelEn: "Smartphone" },
  { key: "camera", labelAr: "كاميرا", labelEn: "Camera" },
  { key: "shopping-cart", labelAr: "سلة تسوق", labelEn: "Cart" },
  { key: "tv", labelAr: "تلفزيون / عرض", labelEn: "TV / Display" },
  { key: "plug", labelAr: "كهرباء / قابس", labelEn: "Plug" },
  { key: "usb", labelAr: "USB", labelEn: "USB" },
  { key: "package", labelAr: "عام / صندوق", labelEn: "General / Package" },
  { key: "truck", labelAr: "توصيل", labelEn: "Delivery" },
  { key: "shield-check", labelAr: "حماية / موثوقية", labelEn: "Shield" },
  { key: "repeat", labelAr: "إرجاع / تبديل", labelEn: "Returns" },
  { key: "star", labelAr: "مميز", labelEn: "Star" },
  { key: "zap", labelAr: "طاقة / سريع", labelEn: "Zap" },
  { key: "heart", labelAr: "مفضلة", labelEn: "Heart" },
  { key: "phone", labelAr: "هاتف", labelEn: "Phone" },
  { key: "message-circle", labelAr: "واتساب / رسالة", labelEn: "Message / WhatsApp" },
];

export function normalizeLucideKey(key: string | null | undefined): string {
  return (key ?? "").trim().toLowerCase().replace(/_/g, "-");
}

export function isKnownPickerKey(key: string | null | undefined): boolean {
  const n = normalizeLucideKey(key);
  return LUCIDE_ICON_PICKER_OPTIONS.some((o) => o.key === n);
}

export function getLucideIcon(key: string | null | undefined): LucideIcon {
  if (!key) return Package;
  const k = normalizeLucideKey(key);
  return MAP[k] ?? Package;
}

export function LucideByName({
  name,
  ...props
}: { name: string | null | undefined } & LucideProps) {
  const Icon = getLucideIcon(name);
  return createElement(Icon, props);
}
