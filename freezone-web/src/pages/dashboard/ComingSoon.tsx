import { useTranslation } from "react-i18next";
import { Badge, Card } from "@/components/dashboard/ui";

/**
 * Generic placeholder for dashboard modules still being rebuilt.
 * The old `/admin` panel has been removed, so there is no legacy fallback —
 * each module is replaced by a real implementation as it ships.
 */
export function ComingSoon({
  titleEn,
  titleAr,
  descEn,
  descAr,
}: {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
}) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const title = lang === "ar" ? titleAr : titleEn;
  const desc = lang === "ar" ? descAr : descEn;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{title}</h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar" ? "قيد البناء." : "Under construction."}
          </div>
        </div>
        <Badge tone="warning">{lang === "ar" ? "قريباً" : "Coming soon"}</Badge>
      </div>

      <Card>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--fz-text-soft)", margin: 0 }}>
          {desc}
        </p>
      </Card>
    </>
  );
}

// ─── Pre-bound stubs for each not-yet-built route ────────────────────────────

export const CmsPage = () => (
  <ComingSoon
    titleEn="Pages & CMS"
    titleAr="الصفحات والمحتوى"
    descEn="Drag-and-drop homepage builder: hero slides, ticker, trust bar, featured products, promos, FAQ — draft/publish flow."
    descAr="بناء الصفحة الرئيسية بالسحب والإفلات: شرائح Hero، الشريط المتحرّك، شريط الثقة، المنتجات المميزة، العروض، الأسئلة — مع نظام المسوّدة/النشر."
  />
);

export const DesignPage = () => (
  <ComingSoon
    titleEn="Design & theme"
    titleAr="التصميم"
    descEn="Theme tokens: colors, fonts, radius, header & promo bar styling, hero overlay, trust bar — with live preview."
    descAr="رموز التصميم: الألوان، الخطوط، الزوايا، تنسيق الهيدر وشريط العروض، طبقة Hero، شريط الثقة — مع معاينة مباشرة."
  />
);

