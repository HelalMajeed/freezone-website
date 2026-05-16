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
  const ar = locale === "ar";
  const duration = Math.min(120, Math.max(12, Number(opts.tickerDurationSec) || 40));
  const direction = opts.tickerDirection === "right" ? "right" : "left";
  const waDigits = (opts.whatsappHref ?? opts.phone ?? "").replace(/\D/g, "");
  const whatsappUrl = waDigits ? `https://wa.me/${waDigits}` : null;

  const promoStrip: PublicMarqueeStrip = {
    id: "promo",
    enabled: true,
    bgColor: "#C05D3D",
    textColor: "#ffffff",
    repeatText: ar ? "عروض الأحد" : "SUNDAY OFFERS",
    separator: "%",
    durationSec: 26,
    direction: "left",
  };

  const defaultInfo: PublicTickerSegment[] = ar
    ? [
        { text: "للتواصل مع ارقام المبيعات على مدار الساعة" },
        { text: "الموقع يتحدث يومياً على مدار الساعة" },
        {
          text: "الطلب حصراً من خلال الموقع الإلكتروني وتوصيل مجاني على المنتجات فوق 100,000 دينار عراقي",
        },
        {
          text: "للتواصل مع ارقام المبيعات على الواتساب (اضغط هنا)",
          href: whatsappUrl,
        },
      ]
    : [
        { text: "Contact our sales team 24/7" },
        { text: "Our catalog updates daily" },
        { text: "Order online only — free delivery on orders over 100,000 IQD" },
        { text: "Chat with sales on WhatsApp (tap here)", href: whatsappUrl },
      ];

  const segments: PublicTickerSegment[] =
    tickerRows.length > 0
      ? tickerRows
          .map((r) => {
            const text = [r.text.trim(), r.suffix?.trim()].filter(Boolean).join(" ");
            return text ? { text } : null;
          })
          .filter((x): x is PublicTickerSegment => x != null)
      : defaultInfo;

  const infoStrip: PublicMarqueeStrip = {
    id: "info",
    enabled: segments.length > 0,
    bgColor: "#0a0a0a",
    textColor: "#ffffff",
    segments,
    durationSec: duration,
    direction,
  };

  return [promoStrip, infoStrip];
}
