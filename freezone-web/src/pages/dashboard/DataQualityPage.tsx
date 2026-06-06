import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  type CategoryOption,
  type DataQualityIssue,
  type DataQualityResponse,
  type DataQualityTab,
} from "@/lib/dashboard/api";
import { Badge, Button, Card, Table } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";

type Lang = "ar" | "en";

const PAGE_SIZE = 25;

const TAB_LABELS: Record<DataQualityTab, { en: string; ar: string }> = {
  missing_image: { en: "Missing image", ar: "بدون صورة" },
  missing_brand: { en: "Missing brand", ar: "بدون علامة" },
  missing_specs: { en: "Missing specs", ar: "مواصفات ناقصة" },
  invalid_filters: { en: "Invalid filter values", ar: "فلاتر غير صالحة" },
  legacy_specs_only: { en: "Legacy specs only", ar: "مواصفات قديمة فقط" },
  no_attributes: { en: "Categories w/o attributes", ar: "أقسام بدون سمات" },
};

const TAB_ORDER: DataQualityTab[] = [
  "missing_image",
  "missing_brand",
  "missing_specs",
  "invalid_filters",
  "legacy_specs_only",
  "no_attributes",
];

const SUMMARY_KEYS: Array<{
  key: keyof NonNullable<DataQualityResponse["summary"]>;
  tab: DataQualityTab | null;
  enLabel: string;
  arLabel: string;
  tone: "neutral" | "info" | "warning" | "danger";
}> = [
  {
    key: "productsMissingImages",
    tab: "missing_image",
    enLabel: "Products without an image",
    arLabel: "منتجات بدون صورة",
    tone: "danger",
  },
  {
    key: "productsMissingBrand",
    tab: "missing_brand",
    enLabel: "Products without a brand",
    arLabel: "منتجات بدون علامة",
    tone: "warning",
  },
  {
    key: "productsMissingSpecs",
    tab: "missing_specs",
    enLabel: "Products with missing specs",
    arLabel: "منتجات بمواصفات ناقصة",
    tone: "warning",
  },
  {
    key: "productsInvalidFilters",
    tab: "invalid_filters",
    enLabel: "Products with invalid filters",
    arLabel: "منتجات بفلاتر غير صالحة",
    tone: "danger",
  },
  {
    key: "productsLegacySpecsOnly",
    tab: "legacy_specs_only",
    enLabel: "Products on legacy specs",
    arLabel: "منتجات بمواصفات قديمة فقط",
    tone: "info",
  },
  {
    key: "categoriesWithoutAttributes",
    tab: "no_attributes",
    enLabel: "Categories without attributes",
    arLabel: "أقسام بدون سمات",
    tone: "warning",
  },
];

export function DashboardDataQualityPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;
  const { t } = useDashboardLocale();

  // Slug → id map so "categories without attributes" rows can deep-link into
  // the per-category attribute builder (ws3-catalog).
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  useEffect(() => {
    dashboardApi.get<CategoryOption[]>("/api/admin/categories").then(setCategories).catch(() => {});
  }, []);
  const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

  const [tab, setTab] = useState<DataQualityTab>("missing_image");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<DataQualityIssue[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<DataQualityResponse["summary"]>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const url = `/api/admin/data-quality?tab=${tab}&page=${page}&limit=${PAGE_SIZE}`;
    dashboardApi
      .get<DataQualityResponse>(url)
      .then((d) => {
        setItems(d.items);
        setTotal(d.total);
        setSummary(d.summary ?? {});
        setErr(null);
      })
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

  useEffect(load, [tab, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "جودة البيانات" : "Data quality"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "اكتشف المنتجات والأقسام التي تحتاج إصلاحاً قبل النشر."
              : "Find products and categories that need cleanup before publishing."}
          </div>
        </div>
        <Button variant="secondary" onClick={load}>
          {lang === "ar" ? "تحديث" : "Refresh"}
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          marginBottom: 18,
        }}
      >
        {SUMMARY_KEYS.map((k) => {
          const v = summary?.[k.key] ?? 0;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => {
                if (k.tab) {
                  setTab(k.tab);
                  setPage(1);
                }
              }}
              style={{
                textAlign: "start",
                background: "#fff",
                border: "1px solid var(--fz-border, #e5e7eb)",
                borderRadius: "var(--fz-radius)",
                padding: 16,
                cursor: k.tab ? "pointer" : "default",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                {lang === "ar" ? k.arLabel : k.enLabel}
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 28, fontWeight: 700 }}>{v.toLocaleString(lang === "ar" ? "ar-IQ" : "en-IQ")}</span>
                {v > 0 && <Badge tone={k.tone}>{lang === "ar" ? "بحاجة عمل" : "Needs work"}</Badge>}
              </div>
            </button>
          );
        })}
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
                onClick={() => {
                  setTab(k);
                  setPage(1);
                }}
                style={{
                  background: isActive ? "var(--fz-brand, #2563eb)" : "transparent",
                  color: isActive ? "#fff" : "var(--fz-text)",
                  border: "1px solid",
                  borderColor: isActive ? "var(--fz-brand, #2563eb)" : "var(--fz-border, #e5e7eb)",
                  padding: "6px 12px",
                  borderRadius: "var(--fz-radius)",
                  cursor: "pointer",
                  fontSize: 12.5,
                  fontWeight: 500,
                }}
              >
                {TAB_LABELS[k][lang]}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <>
            <Table
              rowKey={(r) => `${r.productId}-${r.issue}-${r.attributeKey ?? ""}`}
              rows={items}
              empty={lang === "ar" ? "كل شيء على ما يرام في هذا التبويب 🎉" : "Nothing to fix in this tab 🎉"}
              columns={[
                {
                  header: lang === "ar" ? "المنتج" : "Product",
                  cell: (r) => {
                    // no_attributes rows are categories (productId 0) — deep
                    // link into the attribute builder; product rows open the
                    // full-page product editor.
                    const categoryId = categoryIdBySlug.get(r.categorySlug);
                    const target =
                      r.issue === "no_attributes"
                        ? categoryId != null
                          ? `/dashboard/categories/${categoryId}/attributes`
                          : "/dashboard/categories"
                        : r.productId > 0
                          ? `/dashboard/products/${r.productId}`
                          : "/dashboard/products";
                    return (
                      <div>
                        <Link
                          to={target}
                          title={r.issue === "no_attributes" ? t("dq.openAttrBuilder") : t("dq.openProduct")}
                          style={{ fontWeight: 600, color: "var(--fz-brand)" }}
                        >
                          {lang === "ar" ? r.nameAr || r.nameEn : r.nameEn}
                        </Link>
                        <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                          {r.issue === "no_attributes" ? r.categorySlug : `#${r.productId} · ${r.categoryName}`}
                        </div>
                      </div>
                    );
                  },
                },
                {
                  header: lang === "ar" ? "المشكلة" : "Issue",
                  cell: (r) => (
                    <div>
                      <Badge tone="warning">{r.issue}</Badge>
                      {r.detail && (
                        <div style={{ fontSize: 12, color: "var(--fz-text-muted)", marginTop: 4 }}>
                          {r.detail}
                        </div>
                      )}
                      {r.attributeKey && (
                        <div style={{ fontSize: 11, color: "var(--fz-text-muted)", marginTop: 2, fontFamily: "monospace" }}>
                          {r.attributeKey}
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  header: lang === "ar" ? "الإصلاح المقترح" : "Suggested fix",
                  cell: (r) => (
                    <span style={{ fontSize: 12.5, color: "var(--fz-text-soft)" }}>
                      {r.suggestedFix ?? "—"}
                    </span>
                  ),
                },
                {
                  header: lang === "ar" ? "الحالة" : "Status",
                  width: "100px",
                  cell: (r) =>
                    r.published ? (
                      <Badge tone="success">{lang === "ar" ? "منشور" : "Published"}</Badge>
                    ) : (
                      <Badge tone="neutral">{lang === "ar" ? "مسودة" : "Draft"}</Badge>
                    ),
                },
              ]}
            />
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderTop: "1px solid var(--fz-border, #e5e7eb)",
                  fontSize: 13,
                  color: "var(--fz-text-soft)",
                }}
              >
                <span>
                  {lang === "ar"
                    ? `${total.toLocaleString("ar-IQ")} عنصر · صفحة ${page} من ${totalPages}`
                    : `${total.toLocaleString("en-IQ")} issues · page ${page} of ${totalPages}`}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    {lang === "ar" ? "السابق" : "Prev"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    {lang === "ar" ? "التالي" : "Next"}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </>
  );
}

export default DashboardDataQualityPage;
