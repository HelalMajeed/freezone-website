export type ButtonStyleToken = "solid" | "outline" | "ghost";

export type ThemeTokens = {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  background: string;
  surface: string;
  /// Full CSS background-image value, e.g. url(https://…) or linear-gradient(…)
  backgroundImage: string;
  cardRadius: string;
  buttonRadius: string;
  sectionSpacing: string;
  shadowCard: string;
  fontHeading: string;
  fontBody: string;
  headingScale: string;
  buttonStyle: ButtonStyleToken;
};

export const DEFAULT_THEME: ThemeTokens = {
  /** Storefront structure: primary black (CTAs solid); pair with red accents in CSS tokens */
  primary: "#0A0A0A",
  primaryForeground: "#ffffff",
  secondary: "#f5f5f5",
  secondaryForeground: "#0a0a0a",
  background: "#ffffff",
  surface: "#f5f5f5",
  backgroundImage: "",
  cardRadius: "12px",
  buttonRadius: "8px",
  sectionSpacing: "48px",
  shadowCard: "0 10px 40px rgba(0,0,0,0.08)",
  fontHeading: "inherit",
  fontBody: "inherit",
  headingScale: "1",
  buttonStyle: "solid",
};

function coerceButtonStyle(v: unknown): ButtonStyleToken {
  if (v === "outline" || v === "ghost" || v === "solid") return v;
  return DEFAULT_THEME.buttonStyle;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim().replace(/^#/, "");
  if (s.length !== 6) return null;
  const n = parseInt(s, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/**
 * Map legacy bright “Instagram / default UI” blues saved as `themeTokens.primary`
 * to the current brand black. Dark blues (old navy) normalize to black.
 */
export function normalizeBrandPrimary(primary: string): string {
  const BRAND = DEFAULT_THEME.primary;
  const t = primary.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(t)) return t;
  if (t.toLowerCase() === "#0b1f3a") return BRAND;
  const rgb = hexToRgb(t);
  if (!rgb) return t;
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0.0001) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  /** perceived lightness — only replace bright blues/cyans, not navy */
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (s > 0.12 && h >= 165 && h <= 275 && L > 0.42) return BRAND;
  return t;
}

export function mergeThemeTokens(raw: unknown): ThemeTokens {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_THEME };
  const o = raw as Record<string, unknown>;
  const rawPrimary =
    typeof o.primary === "string" && o.primary.trim() ? o.primary.trim() : DEFAULT_THEME.primary;
  return {
    primary: normalizeBrandPrimary(rawPrimary),
    primaryForeground:
      typeof o.primaryForeground === "string" ? o.primaryForeground : DEFAULT_THEME.primaryForeground,
    secondary: typeof o.secondary === "string" ? o.secondary : DEFAULT_THEME.secondary,
    secondaryForeground:
      typeof o.secondaryForeground === "string" ? o.secondaryForeground : DEFAULT_THEME.secondaryForeground,
    background: typeof o.background === "string" ? o.background : DEFAULT_THEME.background,
    surface: typeof o.surface === "string" ? o.surface : DEFAULT_THEME.surface,
    backgroundImage: typeof o.backgroundImage === "string" ? o.backgroundImage : DEFAULT_THEME.backgroundImage,
    cardRadius: typeof o.cardRadius === "string" ? o.cardRadius : DEFAULT_THEME.cardRadius,
    buttonRadius: typeof o.buttonRadius === "string" ? o.buttonRadius : DEFAULT_THEME.buttonRadius,
    sectionSpacing: typeof o.sectionSpacing === "string" ? o.sectionSpacing : DEFAULT_THEME.sectionSpacing,
    shadowCard: typeof o.shadowCard === "string" ? o.shadowCard : DEFAULT_THEME.shadowCard,
    fontHeading: typeof o.fontHeading === "string" ? o.fontHeading : DEFAULT_THEME.fontHeading,
    fontBody: typeof o.fontBody === "string" ? o.fontBody : DEFAULT_THEME.fontBody,
    headingScale: typeof o.headingScale === "string" ? o.headingScale : DEFAULT_THEME.headingScale,
    buttonStyle: coerceButtonStyle(o.buttonStyle),
  };
}

export function themeToCssVars(t: ThemeTokens): Record<string, string> {
  return {
    "--fz-primary": t.primary,
    "--fz-primary-fg": t.primaryForeground,
    "--fz-secondary": t.secondary,
    "--fz-secondary-fg": t.secondaryForeground,
    "--fz-bg": t.background,
    "--fz-surface": t.surface,
    "--fz-bg-image": t.backgroundImage.trim() || "none",
    "--fz-radius-card": t.cardRadius,
    "--fz-radius-btn": t.buttonRadius,
    "--fz-section-gap": t.sectionSpacing,
    "--fz-shadow-card": t.shadowCard,
    "--fz-font-heading": t.fontHeading,
    "--fz-font-body": t.fontBody,
    "--fz-heading-scale": t.headingScale,
    "--fz-btn-style": t.buttonStyle,
  };
}
