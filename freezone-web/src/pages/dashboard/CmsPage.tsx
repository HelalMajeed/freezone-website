import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/dashboard/ui";
import { HeroSlidesTab } from "./cms/HeroSlidesTab";
import { TickerTab } from "./cms/TickerTab";
import { PromoBannersTab } from "./cms/PromoBannersTab";
import { HomeSpotlightsTab } from "./cms/HomeSpotlightsTab";
import { TrustBarTab } from "./cms/TrustBarTab";
import { ShowroomMediaTab } from "./cms/ShowroomMediaTab";
import { SocialLinksTab } from "./cms/SocialLinksTab";

type Lang = "ar" | "en";

type TabKey =
  | "heroSlides"
  | "ticker"
  | "promoBanners"
  | "homeSpotlights"
  | "trustBar"
  | "showroomMedia"
  | "socialLinks";

const TAB_LABELS: Record<TabKey, { en: string; ar: string }> = {
  heroSlides: { en: "Hero slides", ar: "شرائح Hero" },
  ticker: { en: "Ticker", ar: "الشريط المتحرك" },
  promoBanners: { en: "Promo banners", ar: "بانرات ترويجية" },
  homeSpotlights: { en: "Home spotlights", ar: "شريط الفئات" },
  trustBar: { en: "Trust bar", ar: "شريط الثقة" },
  showroomMedia: { en: "Showroom", ar: "Showroom" },
  socialLinks: { en: "Social links", ar: "روابط اجتماعية" },
};

const TAB_ORDER: TabKey[] = [
  "heroSlides",
  "ticker",
  "promoBanners",
  "homeSpotlights",
  "trustBar",
  "showroomMedia",
  "socialLinks",
];

export function DashboardCmsPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;
  const [tab, setTab] = useState<TabKey>("heroSlides");

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "محتوى الصفحة الرئيسية" : "Homepage content"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "إدارة كل العناصر التي تظهر على الصفحة الرئيسية للزوار."
              : "Manage every block that appears on the homepage for visitors."}
          </div>
        </div>
      </div>

      <Card tight>
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: "10px 14px",
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
            flexWrap: "wrap",
          }}
        >
          {TAB_ORDER.map((k) => {
            const isActive = tab === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                style={{
                  background: isActive ? "var(--fz-brand, #2563eb)" : "transparent",
                  color: isActive ? "#fff" : "var(--fz-text)",
                  border: "1px solid",
                  borderColor: isActive ? "var(--fz-brand, #2563eb)" : "var(--fz-border, #e5e7eb)",
                  padding: "8px 14px",
                  borderRadius: "var(--fz-radius)",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {TAB_LABELS[k][lang]}
              </button>
            );
          })}
        </div>

        <div style={{ padding: 16 }}>
          {tab === "heroSlides" && <HeroSlidesTab lang={lang} />}
          {tab === "ticker" && <TickerTab lang={lang} />}
          {tab === "promoBanners" && <PromoBannersTab lang={lang} />}
          {tab === "homeSpotlights" && <HomeSpotlightsTab lang={lang} />}
          {tab === "trustBar" && <TrustBarTab lang={lang} />}
          {tab === "showroomMedia" && <ShowroomMediaTab lang={lang} />}
          {tab === "socialLinks" && <SocialLinksTab lang={lang} />}
        </div>
      </Card>
    </>
  );
}

export default DashboardCmsPage;
