// Map a Shopify `product_type` / `vendor` / `title` triple onto an existing
// FreeZone category slug. Used by the importer so products land in the right
// storefront bucket instead of the `needs-review` fallback.
//
// The match is intentionally simple and deterministic:
//   1. Lowercase the inputs.
//   2. For each candidate slug, count how many of its keywords appear as a
//      whole-word substring in any of the three input strings.
//   3. Pick the slug with the highest hit count; ties break by KEYWORD_ORDER
//      below (more specific buckets first).
//   4. No hits → return `null` so the caller falls back to `needs-review`.
//
// Adding a new bucket: append to `KEYWORD_MAP` only. Tests in
// `resolve-category.test.ts` enforce a representative sample.

export interface CategoryHint {
  product_type?: string | null;
  vendor?: string | null;
  title?: string | null;
}

/** Slug → list of keywords. Keywords are matched case-insensitively as words. */
export const KEYWORD_MAP: Record<string, string[]> = {
  laptops: ["laptop", "notebook", "ultrabook", "macbook", "thinkpad", "ideapad", "zenbook", "rog strix g", "tuf gaming a", "tuf gaming f"],
  monitors: ["monitor", "display"],
  printers: ["printer", "ink cartridge", "toner", "ink tank"],
  components: [
    "motherboard", "mainboard", "z490", "z590", "z690", "z790", "trx40", "wrx80",
    "x570", "x670", "b450", "b550", "b650", "b760", "h610", "h510",
    "cpu", "processor", "core i3", "core i5", "core i7", "core i9", "ryzen", "threadripper", "celeron",
    "gpu", "graphics card", "geforce", "rtx", "gtx", "radeon",
    "ram", "memory", "ddr4", "ddr5", "dimm",
    "ssd", "nvme", "hard drive", "hdd", "m.2",
    "psu", "power supply", "case", "cooler", "cooling", "heatsink", "fan",
    "thermal paste",
  ],
  accessories: [
    "keyboard", "mouse", "mousepad", "mouse pad",
    "headphones", "headset", "earbud", "earphones", "microphone",
    "webcam", "usb hub", "cable", "adapter",
    "docking station",
  ],
  gaming: ["gaming chair", "controller", "joystick", "gamepad", "racing wheel"],
  cctv: ["cctv", "nvr", "dvr", "ip camera", "ptz", "surveillance camera"],
  security: ["alarm system", "access control", "fingerprint reader", "biometric"],
  "smart-home": ["smart bulb", "smart plug", "smart light", "philips hue", "smart switch", "smart speaker"],
  phones: ["smartphone", "iphone", "android phone", "galaxy s", "galaxy a", "pixel"],
  "power-solutions": ["ups", "battery backup", "inverter", "voltage stabilizer", "surge protector"],
  software: ["antivirus", "office 365", "windows license", "subscription key"],
  computers: ["desktop pc", "tower pc", "mini pc"],
  "all-in-one": ["all-in-one pc", "aio pc"],
};

/** When two slugs tie on keyword hits, this order picks the more specific one. */
const KEYWORD_ORDER: string[] = [
  "laptops",
  "phones",
  "cctv",
  "monitors",
  "printers",
  "components",
  "gaming",
  "accessories",
  "security",
  "smart-home",
  "power-solutions",
  "software",
  "all-in-one",
  "computers",
];

const WORD_BOUNDARY_RE = /[^a-z0-9]+/i;

function tokenize(s: string | null | undefined): string {
  if (!s) return "";
  return ` ${s.toLowerCase().replace(WORD_BOUNDARY_RE, " ")} `;
}

function hits(haystack: string, keywords: string[]): number {
  let n = 0;
  for (const kw of keywords) {
    const needle = ` ${kw.toLowerCase()} `;
    if (haystack.includes(needle)) n += 1;
    /** Some keywords contain `.` or hyphens (e.g. "m.2"). The simple
     *  word-boundary split already turned those into spaces — `m 2` —
     *  so try the spaced form too. */
    const spaced = ` ${kw.toLowerCase().replace(/[.\-]/g, " ")} `;
    if (spaced !== needle && haystack.includes(spaced)) n += 1;
  }
  return n;
}

/**
 * Returns the best-matching slug from `KEYWORD_MAP`, or `null` when no
 * keyword in any bucket appears in the input. Exposed for testing.
 */
export function pickCategorySlug(hint: CategoryHint): string | null {
  const haystack = [hint.product_type, hint.vendor, hint.title].map(tokenize).join(" ");
  let best: { slug: string; count: number } | null = null;
  for (const slug of Object.keys(KEYWORD_MAP)) {
    const count = hits(haystack, KEYWORD_MAP[slug]);
    if (count === 0) continue;
    if (!best || count > best.count) {
      best = { slug, count };
    } else if (count === best.count) {
      /** Tie — prefer the slug that appears earlier in KEYWORD_ORDER. */
      const bestRank = KEYWORD_ORDER.indexOf(best.slug);
      const cur = KEYWORD_ORDER.indexOf(slug);
      if (cur >= 0 && (bestRank < 0 || cur < bestRank)) best = { slug, count };
    }
  }
  return best?.slug ?? null;
}
