import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  type Brand,
  type CategoryOption,
  type ProductCatalogStatus,
  type ProductListRow,
  type ProductsListResponse,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Table,
} from "@/components/dashboard/ui";
import { ProductFormModal } from "./products/ProductFormModal";

type Lang = "ar" | "en";

type Filters = {
  search: string;
  categoryId: string;
  brandId: string;
  catalogStatus: string; // "" or ProductCatalogStatus
  published: string; // "" | "true" | "false"
};

const EMPTY_FILTERS: Filters = {
  search: "",
  categoryId: "",
  brandId: "",
  catalogStatus: "",
  published: "",
};

const PAGE_SIZE = 25;

const STATUS_TONE: Record<ProductCatalogStatus, "neutral" | "success" | "warning" | "info" | "danger"> = {
  DRAFT: "neutral",
  PENDING_REVIEW: "warning",
  CHANGES_REQUESTED: "info",
  PUBLISHED: "success",
  ARCHIVED: "danger",
};

const STATUS_LABELS: Record<ProductCatalogStatus, { en: string; ar: string }> = {
  DRAFT: { en: "Draft", ar: "مسودة" },
  PENDING_REVIEW: { en: "Review", ar: "مراجعة" },
  CHANGES_REQUESTED: { en: "Changes", ar: "تعديلات" },
  PUBLISHED: { en: "Published", ar: "منشور" },
  ARCHIVED: { en: "Archived", ar: "مؤرشف" },
};

function formatPrice(amount: number, lang: Lang): string {
  const locale = lang === "ar" ? "ar-IQ" : "en-IQ";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "IQD",
    maximumFractionDigits: 0,
  }).format(amount);
}

function resolveImage(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

export function DashboardProductsPage() {
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [rows, setRows] = useState<ProductListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [searchInput, setSearchInput] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(PAGE_SIZE));
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.brandId) params.set("brandId", filters.brandId);
    if (filters.catalogStatus) params.set("catalogStatus", filters.catalogStatus);
    if (filters.published) params.set("published", filters.published);

    dashboardApi
      .get<ProductsListResponse>(`/api/admin/products?${params.toString()}`)
      .then((d) => {
        setRows(d.items);
        setTotal(d.total);
        setTotalPages(d.totalPages);
        setErr(null);
      })
      .catch((e) => setErr(e instanceof DashboardApiError ? e.code : (e as Error).message))
      .finally(() => setLoading(false));
  }, [page, filters]);

  // Load categories + brands once (used in filters + form modal).
  useEffect(() => {
    dashboardApi
      .get<CategoryOption[]>("/api/admin/categories")
      .then(setCategories)
      .catch(() => {
        /* surfaced via load errors */
      });
    dashboardApi
      .get<Brand[]>("/api/admin/brands")
      .then(setBrands)
      .catch(() => {
        /* surfaced via load errors */
      });
  }, []);

  useEffect(load, [load]);

  const applySearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    setPage(1);
    setFilters((f) => ({ ...f, search: searchInput.trim() }));
  };

  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setPage(1);
    setFilters((f) => ({ ...f, [k]: v }));
  };

  const resetFilters = () => {
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const onCreate = () => {
    setEditingId(null);
    setModalOpen(true);
  };

  const onEdit = (id: number) => {
    setEditingId(id);
    setModalOpen(true);
  };

  const onDuplicate = async (row: ProductListRow) => {
    try {
      const res = await dashboardApi.post<{ ok: boolean; data: { id: number } } | { id: number }>(
        `/api/admin/products/${row.id}/duplicate`,
      );
      const newId = "data" in res ? res.data.id : res.id;
      load();
      if (newId) {
        setEditingId(newId);
        setModalOpen(true);
      }
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  const onDelete = async (row: ProductListRow) => {
    const sure = window.confirm(
      lang === "ar"
        ? `حذف "${row.nameAr || row.nameEn}"؟ سيُؤرشف ويختفي من المتجر.`
        : `Delete "${row.nameEn}"? It will be archived and hidden from the storefront.`,
    );
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/products/${row.id}`);
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  const togglePublished = async (row: ProductListRow) => {
    try {
      await dashboardApi.patch(`/api/admin/products/${row.id}`, {
        published: !row.published,
      });
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  const categoryOptions = useMemo(
    () => [
      { value: "", label: lang === "ar" ? "كل الأقسام" : "All categories" },
      ...categories.map((c) => ({
        value: String(c.id),
        label: lang === "ar" ? c.nameAr : c.nameEn,
      })),
    ],
    [categories, lang],
  );

  const brandOptions = useMemo(
    () => [
      { value: "", label: lang === "ar" ? "كل العلامات" : "All brands" },
      ...brands.map((b) => ({
        value: String(b.id),
        label: lang === "ar" ? b.nameAr : b.nameEn,
      })),
    ],
    [brands, lang],
  );

  const statusOptions = [
    { value: "", label: lang === "ar" ? "كل الحالات" : "Any status" },
    ...(Object.keys(STATUS_LABELS) as ProductCatalogStatus[]).map((s) => ({
      value: s,
      label: STATUS_LABELS[s][lang],
    })),
  ];

  const publishedOptions = [
    { value: "", label: lang === "ar" ? "منشور وغير منشور" : "Any visibility" },
    { value: "true", label: lang === "ar" ? "منشور" : "Published" },
    { value: "false", label: lang === "ar" ? "غير منشور" : "Draft" },
  ];

  const anyFiltersActive =
    filters.search ||
    filters.categoryId ||
    filters.brandId ||
    filters.catalogStatus ||
    filters.published;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "المنتجات" : "Products"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "أنشئ المنتجات، عدّل أسعارها وصورها وحالتها."
              : "Create products, edit prices, images, and publish state."}
          </div>
        </div>
        <Button onClick={onCreate}>
          + {lang === "ar" ? "منتج جديد" : "New product"}
        </Button>
      </div>

      <Card tight>
        <form
          onSubmit={applySearch}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto",
            gap: 10,
            padding: 14,
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
            alignItems: "end",
          }}
        >
          <Field label={lang === "ar" ? "بحث" : "Search"}>
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={lang === "ar" ? "اسم، SKU، أو معرّف" : "Name, SKU, or ID"}
            />
          </Field>
          <Field label={lang === "ar" ? "القسم" : "Category"}>
            <Select
              value={filters.categoryId}
              onChange={(e) => setFilter("categoryId", (e.target as HTMLSelectElement).value)}
              options={categoryOptions}
            />
          </Field>
          <Field label={lang === "ar" ? "العلامة" : "Brand"}>
            <Select
              value={filters.brandId}
              onChange={(e) => setFilter("brandId", (e.target as HTMLSelectElement).value)}
              options={brandOptions}
            />
          </Field>
          <Field label={lang === "ar" ? "الحالة" : "Status"}>
            <Select
              value={filters.catalogStatus}
              onChange={(e) => setFilter("catalogStatus", (e.target as HTMLSelectElement).value)}
              options={statusOptions}
            />
          </Field>
          <Field label={lang === "ar" ? "الظهور" : "Visibility"}>
            <Select
              value={filters.published}
              onChange={(e) => setFilter("published", (e.target as HTMLSelectElement).value)}
              options={publishedOptions}
            />
          </Field>
          <div style={{ display: "flex", gap: 6 }}>
            <Button type="submit" variant="primary">
              {lang === "ar" ? "تطبيق" : "Apply"}
            </Button>
            {anyFiltersActive && (
              <Button type="button" variant="ghost" onClick={resetFilters}>
                {lang === "ar" ? "إعادة" : "Reset"}
              </Button>
            )}
          </div>
        </form>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <>
            <Table
              rowKey={(r) => r.id}
              rows={rows}
              empty={
                anyFiltersActive
                  ? lang === "ar"
                    ? "لا نتائج مطابقة."
                    : "No matches."
                  : lang === "ar"
                    ? "لا توجد منتجات بعد."
                    : "No products yet."
              }
              columns={[
                {
                  header: "",
                  width: "60px",
                  cell: (r) => (
                    <span
                      style={{
                        display: "inline-flex",
                        width: 44,
                        height: 44,
                        background: "var(--fz-bg-soft, #f1f5f9)",
                        border: "1px solid var(--fz-border, #e5e7eb)",
                        borderRadius: 8,
                        overflow: "hidden",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {r.images[0]?.url ? (
                        <img
                          src={resolveImage(r.images[0].url)}
                          alt={r.nameEn}
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <span style={{ fontSize: 18 }}>📦</span>
                      )}
                    </span>
                  ),
                },
                {
                  header: lang === "ar" ? "المنتج" : "Product",
                  cell: (r) => (
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {lang === "ar" ? r.nameAr || r.nameEn : r.nameEn}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                        #{r.id}
                        {r.sku && r.sku !== "—" ? ` · SKU ${r.sku}` : ""}
                      </div>
                    </div>
                  ),
                },
                {
                  header: lang === "ar" ? "القسم" : "Category",
                  cell: (r) => (
                    <span style={{ fontSize: 13 }}>
                      {lang === "ar" ? r.category.nameAr : r.category.nameEn}
                    </span>
                  ),
                },
                {
                  header: lang === "ar" ? "العلامة" : "Brand",
                  cell: (r) => (
                    <span style={{ fontSize: 13, color: "var(--fz-text-soft)" }}>
                      {r.brandRef
                        ? lang === "ar" ? r.brandRef.nameAr : r.brandRef.nameEn
                        : r.brand && r.brand !== "—" ? r.brand : "—"}
                    </span>
                  ),
                },
                {
                  header: lang === "ar" ? "السعر" : "Price",
                  cell: (r) => (
                    <div>
                      <div>{formatPrice(r.price, lang)}</div>
                      {r.oldPrice ? (
                        <div
                          style={{
                            fontSize: 12,
                            textDecoration: "line-through",
                            color: "var(--fz-text-muted)",
                          }}
                        >
                          {formatPrice(r.oldPrice, lang)}
                        </div>
                      ) : null}
                    </div>
                  ),
                },
                {
                  header: lang === "ar" ? "المخزون" : "Stock",
                  width: "80px",
                  cell: (r) => (
                    <span
                      style={{
                        color:
                          r.quantity <= 0
                            ? "var(--fz-danger)"
                            : r.quantity < 5
                              ? "var(--fz-warning, #b45309)"
                              : undefined,
                      }}
                    >
                      {r.quantity}
                    </span>
                  ),
                },
                {
                  header: lang === "ar" ? "الحالة" : "Status",
                  width: "110px",
                  cell: (r) => (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <Badge tone={STATUS_TONE[r.catalogStatus]}>
                        {STATUS_LABELS[r.catalogStatus][lang]}
                      </Badge>
                      {r.published ? (
                        <span style={{ fontSize: 11, color: "var(--fz-text-muted)" }}>
                          {lang === "ar" ? "ظاهر" : "Visible"}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--fz-text-muted)" }}>
                          {lang === "ar" ? "مخفي" : "Hidden"}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  header: "",
                  cell: (r) => (
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <Button size="sm" variant="secondary" onClick={() => togglePublished(r)}>
                        {r.published
                          ? lang === "ar" ? "إخفاء" : "Hide"
                          : lang === "ar" ? "نشر" : "Publish"}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => onEdit(r.id)}>
                        {lang === "ar" ? "تعديل" : "Edit"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDuplicate(r)}>
                        {lang === "ar" ? "نسخ" : "Duplicate"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => onDelete(r)}>
                        ✕
                      </Button>
                    </div>
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
                    ? `${total.toLocaleString("ar-IQ")} منتج · صفحة ${page} من ${totalPages}`
                    : `${total.toLocaleString("en-IQ")} products · page ${page} of ${totalPages}`}
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

      <ProductFormModal
        open={modalOpen}
        productId={editingId}
        categories={categories}
        brands={brands}
        lang={lang}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </>
  );
}

export default DashboardProductsPage;
