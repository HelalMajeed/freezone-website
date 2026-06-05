import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge, Card } from "@/components/dashboard/ui";
import { PromoBannersTab } from "./cms/PromoBannersTab";
import { SocialLinksTab } from "./cms/SocialLinksTab";
import { TrustBarTab } from "./cms/TrustBarTab";
import { HomeSpotlightsTab } from "./cms/HomeSpotlightsTab";

type Lang = "ar" | "en";

type TabKey = "promoBanners" | "homeSpotlights" | "trustBar" | "socialLinks";

const TAB_LABELS: Record<TabKey, { en: string; ar: string }> = {
  promoBanners: { en: "Promo banners", ar: "بانرات ترويجية" },
  homeSpotlights: { en: "Home spotlights", ar: "شريط الفئات" },
  trustBar: { en: "Trust bar", ar: "شريط الثقة" },
  socialLinks: { en: "Social links", ar: "روابط اجتماعية" },
};

const TAB_ORDER: TabKey[] = ["promoBanners", "homeSpotlights", "trustBar", "socialLinks"];

export function DashboardCmsPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;
  const [tab, setTab] = useState<TabKey>("promoBanners");

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "محتوى الصفحة الرئيسية" : "Homepage content"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "إدارة عناصر الصفحة الرئيسية: البانرات، شريط الفئات، شريط الثقة، والشبكات الاجتماعية."
              : "Manage homepage building blocks: promo banners, category strip, trust bar, social links."}
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
          {tab === "promoBanners" && <PromoBannersTab lang={lang} />}
          {tab === "homeSpotlights" && <HomeSpotlightsTab lang={lang} />}
          {tab === "trustBar" && <TrustBarTab lang={lang} />}
          {tab === "socialLinks" && <SocialLinksTab lang={lang} />}
        </div>
      </Card>

      <Card>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <Badge tone="info">{lang === "ar" ? "ملاحظة" : "Note"}</Badge>
          <div style={{ fontSize: 13, color: "var(--fz-text-soft)", lineHeight: 1.6 }}>
            {lang === "ar"
              ? "تحرير شرائح الهيرو (Hero slides) ومعرض الـ Showroom سيتم في تحديث لاحق — تتطلّبان محرّرات مخصّصة (لا تظهر بعد). البقية متاحة هنا اليوم."
              : "Hero slides and the Showroom media gallery will land in a follow-up — each needs a dedicated editor (not surfaced yet). Everything else is editable here today."}
          </div>
        </div>
      </Card>
    </>
  );
}

export default DashboardCmsPage;
