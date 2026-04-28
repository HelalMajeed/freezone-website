import type { LucideIcon } from "lucide-react";
import {
  Aperture,
  BadgeInfo,
  BatteryCharging,
  Bluetooth,
  Box,
  Camera,
  CircleDot,
  Cloud,
  Crosshair,
  Droplets,
  Eye,
  Cpu,
  Fingerprint,
  Dumbbell,
  Fan,
  Gauge,
  Globe,
  HardDrive,
  Headphones,
  Keyboard,
  Leaf,
  Lock,
  Layers,
  Lightbulb,
  MapPinned,
  MemoryStick,
  Mic,
  Monitor,
  Mouse,
  PackageCheck,
  Plug,
  Radio,
  Radar,
  ScanSearch,
  SearchCheck,
  ShieldAlert,
  Ruler,
  Server,
  ShieldCheck,
  Smartphone,
  Speaker,
  Thermometer,
  Timer,
  Tv,
  Usb,
  Video,
  Wrench,
  Wifi,
  Zap,
} from "lucide-react";

/** Small icon hint per facet key — purely decorative for admin tiles. */
export const FACET_ICON_BY_NAME = {
  box: Box,
  cpu: Cpu,
  memory: MemoryStick,
  storage: HardDrive,
  display: Monitor,
  layers: Layers,
  battery: BatteryCharging,
  camera: Camera,
  network: Wifi,
  ports: Server,
  size: Ruler,
  mobile: Smartphone,
  speaker: Speaker,
  fan: Fan,
  power: Plug,
  map: MapPinned,
  fitness: Dumbbell,
  tool: Wrench,
  shield: ShieldCheck,
  info: BadgeInfo,
  bluetooth: Bluetooth,
  lock: Lock,
  fingerprint: Fingerprint,
  gauge: Gauge,
  sensor: Radar,
  scan: ScanSearch,
  alert: ShieldAlert,
  usb: Usb,
  video: Video,
  thermal: Thermometer,
  timer: Timer,
  package: PackageCheck,
  light: Lightbulb,
  cloud: Cloud,
  eye: Eye,
  globe: Globe,
  headphones: Headphones,
  keyboard: Keyboard,
  leaf: Leaf,
  mic: Mic,
  mouse: Mouse,
  radio: Radio,
  zap: Zap,
  lens: Aperture,
  angle: Crosshair,
  smartDetect: SearchCheck,
  waterproof: Droplets,
  nightVision: Eye,
  recorder: Tv,
  poe: Plug,
  channel: CircleDot,
} as const;

export type FacetIconName = keyof typeof FACET_ICON_BY_NAME;

export const FACET_ICON_OPTIONS: ReadonlyArray<{ name: FacetIconName; label: string }> = [
  { name: "box", label: "Box" },
  { name: "cpu", label: "CPU" },
  { name: "memory", label: "Memory" },
  { name: "storage", label: "Storage" },
  { name: "display", label: "Display" },
  { name: "layers", label: "Layers" },
  { name: "battery", label: "Battery" },
  { name: "camera", label: "Camera" },
  { name: "network", label: "Network" },
  { name: "ports", label: "Ports" },
  { name: "size", label: "Size" },
  { name: "mobile", label: "OS/Mobile" },
  { name: "speaker", label: "Audio" },
  { name: "fan", label: "Cooling" },
  { name: "power", label: "Power" },
  { name: "map", label: "Location" },
  { name: "fitness", label: "Sport" },
  { name: "tool", label: "Tool" },
  { name: "shield", label: "Security" },
  { name: "info", label: "Info" },
  { name: "bluetooth", label: "Bluetooth" },
  { name: "lock", label: "Lock" },
  { name: "fingerprint", label: "Fingerprint" },
  { name: "gauge", label: "Performance" },
  { name: "sensor", label: "Sensor" },
  { name: "scan", label: "Scanner" },
  { name: "alert", label: "Alert" },
  { name: "usb", label: "USB" },
  { name: "video", label: "Video" },
  { name: "thermal", label: "Thermal" },
  { name: "timer", label: "Timer" },
  { name: "package", label: "Package" },
  { name: "light", label: "Lighting" },
  { name: "cloud", label: "Cloud" },
  { name: "eye", label: "View" },
  { name: "globe", label: "Global" },
  { name: "headphones", label: "Headphones" },
  { name: "keyboard", label: "Keyboard" },
  { name: "leaf", label: "Eco" },
  { name: "mic", label: "Mic" },
  { name: "mouse", label: "Mouse" },
  { name: "radio", label: "Radio" },
  { name: "zap", label: "Fast" },
  { name: "lens", label: "Lens/Focal" },
  { name: "angle", label: "View angle" },
  { name: "smartDetect", label: "Smart detect" },
  { name: "waterproof", label: "Waterproof/IP" },
  { name: "nightVision", label: "Night vision" },
  { name: "recorder", label: "Recorder/NVR" },
  { name: "poe", label: "PoE" },
  { name: "channel", label: "Channels" },
];

export function isFacetIconName(value: string): value is FacetIconName {
  return value in FACET_ICON_BY_NAME;
}

export function iconFromName(name?: FacetIconName | null): LucideIcon | null {
  if (!name) return null;
  return FACET_ICON_BY_NAME[name] ?? null;
}

function inferFacetIconName(key: string): FacetIconName {
  const k = key.toLowerCase();
  if (k.includes("cpu") || k.includes("processor") || k.includes("chipset")) return "cpu";
  if (k.includes("ram") || k.includes("memory")) return "memory";
  if (k.includes("storage") || k.includes("disk") || k.includes("ssd") || k.includes("hdd")) return "storage";
  if (k.includes("screen") || k.includes("display") || k.includes("resolution") || k.includes("panel")) return "display";
  if (k.includes("gpu") || k.includes("graphics") || k.includes("vram")) return "layers";
  if (k.includes("battery")) return "battery";
  if (k.includes("lens") || k.includes("focal")) return "lens";
  if (k.includes("viewingangle") || k.includes("view_angle") || k.includes("angle") || k.includes("fov")) return "angle";
  if (k.includes("smartdetection") || k.includes("smart_detection") || k.includes("detection")) return "smartDetect";
  if (k.includes("iprating") || k.includes("ip_rating") || k.includes("waterproof") || k.includes("water")) return "waterproof";
  if (k.includes("nightvision") || k.includes("night_vision") || k.includes("infrared") || k.includes("ir")) return "nightVision";
  if (k.includes("recordingresolution") || k.includes("recording_resolution") || k.includes("nvr") || k.includes("dvr") || k.includes("recorder")) return "recorder";
  if (k.includes("poesupport") || k.includes("poe_support") || k.includes("poe")) return "poe";
  if (k.includes("channelcount") || k.includes("channel_count") || k.includes("channel")) return "channel";
  if (k.includes("imagesensor") || k.includes("image_sensor") || k.includes("sensor")) return "sensor";
  if (k.includes("camera")) return "camera";
  if (k.includes("wifi") || k.includes("network") || k.includes("lan") || k.includes("cellular")) return "network";
  if (k.includes("port") || k.includes("usb") || k.includes("hdmi") || k.includes("thunderbolt")) return "ports";
  if (k.includes("dim") || k.includes("weight") || k.includes("size") || k.includes("dimension")) return "size";
  if (k.includes("os") || k.includes("software")) return "mobile";
  if (k.includes("speaker") || k.includes("sound") || k.includes("audio")) return "speaker";
  if (k.includes("fan") || k.includes("cool")) return "fan";
  if (k.includes("bluetooth")) return "bluetooth";
  if (k.includes("finger") || k.includes("biometric")) return "fingerprint";
  if (k.includes("sensor") || k.includes("radar")) return "sensor";
  if (k.includes("scan")) return "scan";
  if (k.includes("alert") || k.includes("alarm")) return "alert";
  if (k.includes("usb")) return "usb";
  if (k.includes("video")) return "video";
  if (k.includes("temp") || k.includes("thermal")) return "thermal";
  if (k.includes("timer") || k.includes("latency")) return "timer";
  if (k.includes("light") || k.includes("led")) return "light";
  if (k.includes("cloud")) return "cloud";
  if (k.includes("view") || k.includes("eye")) return "eye";
  if (k.includes("global") || k.includes("country") || k.includes("region")) return "globe";
  if (k.includes("headphone")) return "headphones";
  if (k.includes("keyboard")) return "keyboard";
  if (k.includes("eco") || k.includes("green")) return "leaf";
  if (k.includes("mic")) return "mic";
  if (k.includes("mouse")) return "mouse";
  if (k.includes("radio")) return "radio";
  if (k.includes("fast") || k.includes("speed")) return "zap";
  if (k.includes("power") || k.includes("voltage")) return "power";
  return "box";
}

export function pickFacetIcon(key: string, override?: FacetIconName | null): LucideIcon {
  const iconByOverride = iconFromName(override);
  if (iconByOverride) return iconByOverride;
  return FACET_ICON_BY_NAME[inferFacetIconName(key)];
}
