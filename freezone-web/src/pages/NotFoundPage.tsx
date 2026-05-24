import { Link, useParams } from "react-router-dom";
import { useTranslations } from "@/i18n/hooks";

/**
 * Locale-aware 404. Replaces the previous silent `<Navigate to="/en">` catch-all
 * so a mistyped URL gives the user an actionable page instead of a confusing
 * bounce to the homepage.
 */
export default function NotFoundPage() {
  const { locale } = useParams<{ locale: string }>();
  const lc = locale === "ar" ? "ar" : "en";
  const t = useTranslations("NotFound");
  const home = `/${lc}`;
  const products = `/${lc}/products`;

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "4rem", fontWeight: 800, color: "#C90000", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: "1.4rem", margin: 0 }}>{t("title")}</h1>
      <p style={{ maxWidth: 440, color: "#64748b", lineHeight: 1.6, margin: 0 }}>{t("body")}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center", marginTop: 8 }}>
        <Link
          to={home}
          style={{ padding: "10px 20px", borderRadius: 8, background: "#0f172a", color: "#fff", textDecoration: "none", fontWeight: 600 }}
        >
          {t("home")}
        </Link>
        <Link
          to={products}
          style={{ padding: "10px 20px", borderRadius: 8, background: "#f1f5f9", color: "#0f172a", border: "1px solid #e2e8f0", textDecoration: "none", fontWeight: 600 }}
        >
          {t("browse")}
        </Link>
      </div>
    </div>
  );
}
