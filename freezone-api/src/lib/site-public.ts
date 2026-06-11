import { prisma, isDatabaseConfigured } from "./prisma";
import { buildMarqueeStrips, type PublicMarqueeStrip } from "./marquee-strips";
import { resolveShippingFeeMap } from "./shipping-fees";
import type { ProvinceCode } from "./iraq-provinces";

export type { PublicMarqueeStrip, PublicTickerSegment } from "./marquee-strips";

/** Deep crimson from brand logo — default for tier-1 social icons */
export const DEFAULT_TOP_BAR_SOCIAL_COLOR = "#B00000";

export type PublicSocialLink = {
  platform: string;
  url: string;
  sortOrder: number;
  /** When false, link is shown in footer only (not in tier-1 top strip) */
  showInTopBar?: boolean;
};

export type PublicSite = {
  storeName: string;
  tagline: string;
  logoUrl: string | null;
  /** Height in px for the header (navbar + mobile menu) logo image */
  headerLogoHeightPx: number;
  phone: string;
  email: string;
  address: string;
  whatsapp: string;
  promoBarText: string;
  promoBarEnabled: boolean;
  /** Tier-1 dark top bar — colors & Lucide icon keys (locale-resolved labels below) */
  topBarBgColor: string;
  topBarContactColor: string;
  topBarPromoColor: string;
  topBarPhoneIconKey: string;
  topBarWhatsappIconKey: string;
  topBarPromoIconKey: string;
  /** Visible text beside phone icon (defaults to `phone` if labels empty) */
  topBarPhoneLabel: string;
  topBarWhatsappLabel: string;
  topBarPromoHref: string | null;
  topBarPhoneHref: string | null;
  topBarWhatsappHref: string | null;
  /** Tier-1 strip: show social icons (URLs from `social`, filtered by `showInTopBar`) */
  topBarSocialEnabled: boolean;
  topBarSocialIconSizePx: number;
  topBarSocialGapPx: number;
  /** CSS color for top-bar social glyphs; empty in DB resolves to logo crimson */
  topBarSocialColor: string;
  maintenanceMode: boolean;
  freeDeliveryThreshold: number;
  standardShippingFee: number;
  /** Resolved per-governorate delivery fee for ALL 18 canonical province codes
   *  (SiteConfig.shippingFeesJson overrides, standardShippingFee fallback). */
  shippingFees: Record<ProvinceCode, number>;
  zainCashWallet: string;
  qiCardMerchantId: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoKeywords?: string | null;
  social: PublicSocialLink[];
  marqueeStrips: PublicMarqueeStrip[];
};

const FB = "https://facebook.com";
const IG = "https://instagram.com";
const TT = "https://tiktok.com";

function staticPublicSite(locale: "en" | "ar"): PublicSite {
  const en = locale === "en";
  return {
    storeName: "Store",
    tagline: en
      ? "Iraq's trusted tech partner — CCTV, computers, gaming, smart solutions."
      : "شريكك التقني في العراق — كاميرات، حواسيب، ألعاب وحلول ذكية.",
    logoUrl: null,
    headerLogoHeightPx: 48,
    phone: "+964 000 000 0000",
    email: "contact@example.com",
    address: en ? "Baghdad, Iraq" : "بغداد، العراق",
    whatsapp: "+9647742222377",
    promoBarText: en
      ? "Free delivery +100,000 IQD · 2-year warranty · Nationwide delivery"
      : "توصيل مجاني +100,000 د.ع · ضمان سنتين",
    promoBarEnabled: true,
    topBarBgColor: "#0a0e1a",
    topBarContactColor: "rgba(255,255,255,0.65)",
    topBarPromoColor: "#10b981",
    topBarPhoneIconKey: "phone",
    topBarWhatsappIconKey: "message-circle",
    topBarPromoIconKey: "zap",
    topBarPhoneLabel: "+964 000 000 0000",
    topBarWhatsappLabel: en ? "WhatsApp" : "واتساب",
    topBarPromoHref: null,
    topBarPhoneHref: null,
    topBarWhatsappHref: null,
    topBarSocialEnabled: true,
    topBarSocialIconSizePx: 20,
    topBarSocialGapPx: 14,
    topBarSocialColor: DEFAULT_TOP_BAR_SOCIAL_COLOR,
    maintenanceMode: false,
    freeDeliveryThreshold: 100000,
    standardShippingFee: 5000,
    shippingFees: resolveShippingFeeMap({ standardShippingFee: 5000 }),
    zainCashWallet: "",
    qiCardMerchantId: "",
    metaTitle: null,
    metaDescription: en
      ? "Iraq's leading electronics store: CCTV & security, computers & laptops, gaming PCs, components, AI & robots, power & UPS, smart home & cities, servers & networking, data solutions. B2B deals. PC builder. 2-year warranty. Programming & professional services."
      : "متجر إلكترونيات رائد في العراق: أنظمة المراقبة والكاميرات، الحواسيب واللابتوبات، أجهزة الألعاب والمكوّنات، الذكاء الاصطناعي والروبوتات، الطاقة والUPS، المنزل والمدن الذكية، الخوادم والشبكات وحلول البيانات. عروض للشركات. مُجمّع أجهزة. ضمان سنتين. حلول برمجية.",
    seoKeywords: null,
    social: [
      { platform: "facebook", url: FB, sortOrder: 0, showInTopBar: true },
      { platform: "instagram", url: IG, sortOrder: 1, showInTopBar: true },
      { platform: "tiktok", url: TT, sortOrder: 2, showInTopBar: true },
    ],
    marqueeStrips: buildMarqueeStrips(locale, {}, []),
  };
}

export async function getPublicSite(locale: "en" | "ar"): Promise<PublicSite> {
  const en = locale === "en";
  if (!isDatabaseConfigured()) {
    return staticPublicSite(locale);
  }

  try {
    const [cfg, socialRows, tickerRows] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 } }),
      prisma.socialLink.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.tickerItem.findMany({ orderBy: { sortOrder: "asc" } }),
    ]);

    if (!cfg) {
      return {
        storeName: en ? "Store" : "المتجر",
        tagline: en ? "Premium tech in Iraq." : "تقنية متميزة في العراق.",
        logoUrl: null,
        headerLogoHeightPx: 48,
        phone: "+964 000 000 0000",
        email: "contact@example.com",
        address: en ? "Baghdad, Iraq" : "بغداد، العراق",
        whatsapp: "+9647742222377",
        promoBarText: "",
        promoBarEnabled: true,
        topBarBgColor: "#0a0e1a",
        topBarContactColor: "rgba(255,255,255,0.65)",
        topBarPromoColor: "#10b981",
        topBarPhoneIconKey: "phone",
        topBarWhatsappIconKey: "message-circle",
        topBarPromoIconKey: "zap",
        topBarPhoneLabel: "+964 000 000 0000",
        topBarWhatsappLabel: en ? "WhatsApp" : "واتساب",
        topBarPromoHref: null,
        topBarPhoneHref: null,
        topBarWhatsappHref: null,
        topBarSocialEnabled: true,
        topBarSocialIconSizePx: 20,
        topBarSocialGapPx: 14,
        topBarSocialColor: DEFAULT_TOP_BAR_SOCIAL_COLOR,
        maintenanceMode: false,
        freeDeliveryThreshold: 100000,
        standardShippingFee: 5000,
        shippingFees: resolveShippingFeeMap({ standardShippingFee: 5000 }),
        zainCashWallet: "",
        qiCardMerchantId: "",
        metaTitle: null,
        metaDescription: null,
        seoKeywords: null,
        social: [
          { platform: "facebook", url: FB, sortOrder: 0, showInTopBar: true },
          { platform: "instagram", url: IG, sortOrder: 1, showInTopBar: true },
          { platform: "tiktok", url: TT, sortOrder: 2, showInTopBar: true },
        ],
        marqueeStrips: buildMarqueeStrips(locale, {}, []),
      };
    }

    const tickerInput = tickerRows.map((r) => ({
      text: en ? r.textEn : r.textAr,
      suffix: r.iconSuffix,
    }));

    return {
      storeName: en ? cfg.storeNameEn : cfg.storeNameAr,
      tagline: en ? cfg.taglineEn : cfg.taglineAr,
      logoUrl: cfg.logoUrl,
      headerLogoHeightPx: Math.min(160, Math.max(20, cfg.headerLogoHeightPx ?? 48)),
      phone: cfg.phone,
      email: cfg.email,
      address: en ? cfg.addressEn : cfg.addressAr,
      whatsapp: cfg.whatsapp,
      promoBarText: en ? cfg.promoBarTextEn : cfg.promoBarTextAr,
      promoBarEnabled: cfg.promoBarEnabled,
      topBarBgColor: cfg.topBarBgColor ?? "#0a0e1a",
      topBarContactColor: cfg.topBarContactColor ?? "rgba(255,255,255,0.65)",
      topBarPromoColor: cfg.topBarPromoColor ?? "#10b981",
      topBarPhoneIconKey: cfg.topBarPhoneIconKey ?? "phone",
      topBarWhatsappIconKey: cfg.topBarWhatsappIconKey ?? "message-circle",
      topBarPromoIconKey: cfg.topBarPromoIconKey ?? "zap",
      topBarPhoneLabel: (en ? cfg.topBarPhoneLabelEn?.trim() : cfg.topBarPhoneLabelAr?.trim()) || cfg.phone,
      topBarWhatsappLabel: en
        ? (cfg.topBarWhatsappLabelEn?.trim() || "WhatsApp")
        : (cfg.topBarWhatsappLabelAr?.trim() || "واتساب"),
      topBarPromoHref: cfg.topBarPromoHref?.trim() || null,
      topBarPhoneHref: cfg.topBarPhoneHref?.trim() || null,
      topBarWhatsappHref: cfg.topBarWhatsappHref?.trim() || null,
      topBarSocialEnabled: cfg.topBarSocialEnabled !== false,
      topBarSocialIconSizePx: Math.min(36, Math.max(12, cfg.topBarSocialIconSizePx ?? 20)),
      topBarSocialGapPx: Math.min(32, Math.max(4, cfg.topBarSocialGapPx ?? 14)),
      topBarSocialColor: (() => {
        const t = (cfg.topBarSocialColor ?? "").trim().slice(0, 64);
        return t || DEFAULT_TOP_BAR_SOCIAL_COLOR;
      })(),
      maintenanceMode: cfg.maintenanceMode,
      freeDeliveryThreshold: cfg.freeDeliveryThreshold,
      standardShippingFee: cfg.standardShippingFee,
      shippingFees: resolveShippingFeeMap({
        standardShippingFee: cfg.standardShippingFee,
        shippingFeesJson: cfg.shippingFeesJson,
      }),
      zainCashWallet: cfg.zainCashWallet ?? "",
      qiCardMerchantId: cfg.qiCardMerchantId ?? "",
      metaTitle: en ? cfg.metaTitleEn : cfg.metaTitleAr,
      metaDescription: en ? cfg.metaDescriptionEn : cfg.metaDescriptionAr,
      seoKeywords: cfg.seoKeywords,
      social: socialRows.map((s) => ({
        platform: s.platform,
        url: s.url,
        sortOrder: s.sortOrder,
        showInTopBar: s.showInTopBar !== false,
      })),
      marqueeStrips: buildMarqueeStrips(
        locale,
        {
          tickerDirection: cfg.tickerDirection,
          tickerDurationSec: cfg.tickerDurationSec,
          whatsappHref: cfg.topBarWhatsappHref,
          phone: cfg.phone,
        },
        tickerInput,
      ),
    };
  } catch {
    return staticPublicSite(locale);
  }
}
