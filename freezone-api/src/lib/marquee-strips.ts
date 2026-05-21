export type PublicTickerSegment = {
  text: string;
  href?: string | null;
};

export type PublicMarqueeStrip = {
  id: "promo" | "info";
  enabled: boolean;
  bgColor: string;
  textColor: string;
  /** Repeat one phrase with a separator (promo strip) */
  repeatText?: string;
  separator?: string;
  /** Multiple messages with bullet separators (info strip) */
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
