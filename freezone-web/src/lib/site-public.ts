import { isDatabaseConfigured } from "./prisma";

/** Brand accent for tier-1 social icons (electric cyan — pairs with navy primary) */
export const DEFAULT_TOP_BAR_SOCIAL_COLOR = "#6b7280";

export type PublicSocialLink = {
  platform: string;
  url: string;
  sortOrder: number;
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
  topBarBgColor: string;
  topBarContactColor: string;
  topBarPromoColor: string;
  topBarPhoneIconKey: string;
  topBarWhatsappIconKey: string;
  topBarPromoIconKey: string;
  topBarPhoneLabel: string;
  topBarWhatsappLabel: string;
  topBarPromoHref: string | null;
  topBarPhoneHref: string | null;
  topBarWhatsappHref: string | null;
  topBarSocialEnabled: boolean;
  topBarSocialIconSizePx: number;
  topBarSocialGapPx: number;
  topBarSocialColor: string;
  maintenanceMode: boolean;
  freeDeliveryThreshold: number;
  standardShippingFee: number;
  zainCashWallet: string;
  qiCardMerchantId: string;
  metaTitle?: string | null;
  metaDescription?: string | null;
  seoKeywords?: string | null;
  social: PublicSocialLink[];
};

const FB = "https://facebook.com";
const IG = "https://www.instagram.com/fzone.iq/";
const TT = "https://tiktok.com";

export function staticPublicSite(locale: "en" | "ar"): PublicSite {
  const en = locale === "en";
  return {
    storeName: "FreeZone",
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
  };
}

export async function getPublicSite(locale: "en" | "ar"): Promise<PublicSite> {
  if (!isDatabaseConfigured()) {
    return staticPublicSite(locale);
  }
  const { fetchStorefrontBootstrap } = await import("./storefront-bootstrap");
  return (await fetchStorefrontBootstrap(locale)).site;
}
