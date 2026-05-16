import { type PublicSite, DEFAULT_TOP_BAR_SOCIAL_COLOR } from "@/lib/site-public";
import { buildMarqueeStrips } from "@/lib/marquee-strips";
import {
  composeHomeCmsFromParts,
  type CmsHeroSlideRow,
  type HomeCmsPayload,
} from "@/lib/layout-cms";
import type { LocaleCode } from "@/lib/layout-cms";
import { BRANDS, CATEGORIES, PRODUCTS, type Brand, type Category, type Product } from "@/lib/data";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/theme-tokens";
import type { StorefrontCmsSection } from "@/lib/cms-page-storefront";

export type StorefrontValue = {
  site: PublicSite;
  home: HomeCmsPayload;
  catalog: { products: Product[]; categories: Category[]; brands: Brand[] };
  theme: ThemeTokens;
  homeSections: StorefrontCmsSection[] | null;
};

export type AdminCmsDraft = {
  siteConfig: {
    storeNameEn: string;
    storeNameAr: string;
    taglineEn: string;
    taglineAr: string;
    logoUrl: string | null;
    headerLogoHeightPx?: number | null;
    phone: string;
    email: string;
    addressEn: string;
    addressAr: string;
    whatsapp: string;
    zainCashWallet: string;
    qiCardMerchantId: string;
    freeDeliveryThreshold: number;
    standardShippingFee: number;
    promoBarTextEn: string;
    promoBarTextAr: string;
    promoBarEnabled: boolean;
    tickerDirection?: string | null;
    tickerDurationSec?: number | null;
    topBarBgColor?: string | null;
    topBarContactColor?: string | null;
    topBarPhoneLabelEn?: string | null;
    topBarPhoneLabelAr?: string | null;
    topBarWhatsappLabelEn?: string | null;
    topBarWhatsappLabelAr?: string | null;
    topBarPhoneIconKey?: string | null;
    topBarWhatsappIconKey?: string | null;
    topBarPromoIconKey?: string | null;
    topBarPromoColor?: string | null;
    topBarPromoHref?: string | null;
    topBarPhoneHref?: string | null;
    topBarWhatsappHref?: string | null;
    topBarSocialEnabled?: boolean | null;
    topBarSocialIconSizePx?: number | null;
    topBarSocialGapPx?: number | null;
    topBarSocialColor?: string | null;
    maintenanceMode: boolean;
    heroAutoplayMs?: number | null;
    /** 0–100: darkness of black overlay on hero images */
    heroScrimOpacityPct?: number | null;
    heroNavArrowColor?: string | null;
    heroNavArrowOpacityPct?: number | null;
    heroNavBoxColor?: string | null;
    heroNavBoxOpacityPct?: number | null;
    trustBarBgColor?: string | null;
    trustBarBgOpacityPct?: number | null;
    trustBarTextColor?: string | null;
    trustBarIconColor?: string | null;
    navItemsJson?: unknown | null;
    metaTitleEn?: string | null;
    metaTitleAr?: string | null;
    metaDescriptionEn?: string | null;
    metaDescriptionAr?: string | null;
    seoKeywords?: string | null;
    homePageCopyJson?: unknown | null;
  };
  socialLinks: { platform: string; url: string; sortOrder: number; showInTopBar?: boolean }[];
  trustBarItems: { id: number; textEn: string; textAr: string; iconKey?: string; sortOrder: number }[];
  homeSpotlights: {
    id: number;
    labelEn: string;
    labelAr: string;
    href: string;
    imageUrl: string | null;
    iconKey: string | null;
    sortOrder: number;
    active: boolean;
  }[];
  heroSlides: CmsHeroSlideRow[];
  showroomMedia: {
    id: number;
    kind: string;
    url: string;
    titleEn: string | null;
    titleAr: string | null;
    sortOrder: number;
  }[];
  promoBanners: {
    id: number;
    titleEn: string;
    titleAr: string;
    subEn: string;
    subAr: string;
    imageUrl: string;
    href: string;
    catSlug: string | null;
    sortOrder: number;
    active: boolean;
  }[];
};

export function draftToStorefrontValue(
  draft: AdminCmsDraft,
  locale: LocaleCode,
  catalog?: { products: Product[]; categories: Category[]; brands: Brand[] },
): StorefrontValue {
  const en = locale === "en";
  const cfg = draft.siteConfig;
  const site: PublicSite = {
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
    topBarPhoneLabel:
      (en ? cfg.topBarPhoneLabelEn?.trim() : cfg.topBarPhoneLabelAr?.trim()) || cfg.phone,
    topBarWhatsappLabel: en
      ? (cfg.topBarWhatsappLabelEn?.trim() || "WhatsApp")
      : (cfg.topBarWhatsappLabelAr?.trim() || "واتساب"),
    topBarPromoHref: cfg.topBarPromoHref?.trim() || null,
    topBarPhoneHref: cfg.topBarPhoneHref?.trim() || null,
    topBarWhatsappHref: cfg.topBarWhatsappHref?.trim() || null,
    topBarSocialEnabled: cfg.topBarSocialEnabled !== false,
    topBarSocialIconSizePx: Math.min(36, Math.max(12, Math.round(Number(cfg.topBarSocialIconSizePx ?? 20)))),
    topBarSocialGapPx: Math.min(32, Math.max(4, Math.round(Number(cfg.topBarSocialGapPx ?? 14)))),
    topBarSocialColor: (() => {
      const t = (cfg.topBarSocialColor ?? "").trim().slice(0, 64);
      return t || DEFAULT_TOP_BAR_SOCIAL_COLOR;
    })(),
    maintenanceMode: cfg.maintenanceMode,
    freeDeliveryThreshold: cfg.freeDeliveryThreshold,
    standardShippingFee: cfg.standardShippingFee,
    zainCashWallet: cfg.zainCashWallet ?? "",
    qiCardMerchantId: cfg.qiCardMerchantId ?? "",
    metaTitle: en ? cfg.metaTitleEn : cfg.metaTitleAr,
    metaDescription: en ? cfg.metaDescriptionEn : cfg.metaDescriptionAr,
    seoKeywords: cfg.seoKeywords,
    social: draft.socialLinks.map((s) => ({
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
      [],
    ),
  };

  const baseHome = composeHomeCmsFromParts(
    cfg,
    draft.trustBarItems.map((t) => ({
      id: t.id,
      textEn: t.textEn,
      textAr: t.textAr,
      iconKey: t.iconKey || "truck",
    })),
    draft.homeSpotlights,
    draft.heroSlides,
    locale,
  );

  let home: HomeCmsPayload = baseHome;

  if (draft.showroomMedia?.length) {
    home = {
      ...home,
      showroom: draft.showroomMedia.map((s) => ({
        id: s.id,
        url: s.url,
        kind: s.kind || "image",
        title: en
          ? (s.titleEn ?? "").trim() || (s.titleAr ?? "").trim()
          : (s.titleAr ?? "").trim() || (s.titleEn ?? "").trim(),
      })),
    };
  }

  if (draft.promoBanners?.length) {
    home = {
      ...home,
      promoBanners: draft.promoBanners
        .filter((p) => p.active !== false)
        .map((p) => ({
          id: p.id,
          title: en ? p.titleEn : p.titleAr,
          sub: en ? p.subEn : p.subAr,
          imageUrl: p.imageUrl,
          href: p.href || "/products",
        })),
    };
  }

  const cat = catalog ?? { products: PRODUCTS, categories: CATEGORIES, brands: BRANDS };
  return { site, home, catalog: cat, theme: DEFAULT_THEME, homeSections: null };
}
