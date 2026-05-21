export type PublicTickerSegment = {
  text: string;
  href?: string | null;
};

export type PublicMarqueeStrip = {
  id: "promo" | "info";
  enabled: boolean;
  bgColor: string;
  textColor: string;
  repeatText?: string;
  separator?: string;
  segments?: PublicTickerSegment[];
  durationSec: number;
  direction: "left" | "right";
};

export type TickerRowInput = {
  text: string;
  suffix?: string | null;
};

export function buildMarqueeStrips(
  locale: "en" | "ar",
  opts: {
    tickerDirection?: string | null;
    tickerDurationSec?: number | null;
    whatsappHref?: string | null;
    phone?: string | null;
  },
  tickerRows: TickerRowInput[],
): PublicMarqueeStrip[] {
  void locale;
  void opts;
  void tickerRows;
  return [];
}

/** Static fallback when API bootstrap is unavailable */
export function staticMarqueeStrips(_locale: "en" | "ar"): PublicMarqueeStrip[] {
  return [];
}
