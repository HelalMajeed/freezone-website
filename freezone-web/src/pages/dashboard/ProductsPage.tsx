/**
 * Products list — server-driven table with URL-persisted filters/sort/page,
 * row selection + bulk actions (contract (i) + price ops), CSV export
 * honoring the active filters, and deep links from GlobalSearch
 * (`?search=`) and the notification bell (`?catalogStatus=PENDING_REVIEW`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ClipboardCheck, Download, Package, Plus, Upload } from "lucide-react";
import {
  dashboardApi,
  productsBulkApi,
  productsCsvApi,
  saveBlobAsFile,
  type Brand,
  type CategoryOption,
  type ProductCatalogStatus,
  type ProductListRow,
  type ProductsBulkPayload,
  type ProductsBulkResponse,
  type ProductsListResponse,
} from "@/lib/dashboard/api";
import type { TableSort } from "@/components/dashboard/ui";
import { productEditorApi, productsBulkPriceApi } from "@/lib/dashboard/api-extra";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  Select,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale, type DashboardMessageKey } from "@/lib/dashboard/i18n";
import {
  CATALOG_STATUSES,
  CATALOG_STATUS_TONE,
  catalogStatusKey,
  formatIqd,
  resolveUploadUrl,
} from "./products/shared";
import s from "./products.module.css";

const DEFAULT_PAGE_SIZE = 25;
const SORT_KEYS = new Set(["id", "price", "name", "quantity", "updated"]);

type BulkActionKey =
  | ""
  | "publish"
  | "unpublish"
  | "soft_delete"
  | "restore"
  | "change_category"
  | "change_brand"
  | "catalog_status"
  | "price_percent"
  | "price_fixed_delta"
  | "price_set";

const BULK_LABEL_KEY: Record<Exclude<BulkActionKey, "">, DashboardMessageKey> = {
  publish: "bulk.publish",
  unpublish: "bulk.unpublish",
  soft_delete: "bulk.archive",
  restore: "bulk.restore",
  change_category: "bulk.changeCategory",
  change_brand: "bulk.changeBrand",
  catalog_status: "bulk.setStatus",
  price_percent: "bulk.pricePercent",
  price_fixed_delta: "bulk.priceDelta",
  price_set: "bulk.priceSet",
};

export function DashboardProductsPage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-backed filters / sort / pagination ────────────────────────────────
  const search = searchParams.get("search") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const brandId = searchParams.get("brandId") ?? "";
  const catalogStatus = searchParams.get("catalogStatus") ?? "";
  const published = searchParams.get("published") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(
    10,
    Math.min(100, parseInt(searchParams.get("pageSize") ?? String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
  );
  const sortParam = searchParams.get("sort") ?? "id_desc";

  const sort: TableSort | null = useMemo(() => {
    const m = /^([a-z]+)_(asc|desc)$/.exec(sortParam);
    if (!m || !SORT_KEYS.has(m[1])) return { key: "id", dir: "desc" };
    return { key: m[1], dir: m[2] as "asc" | "desc" };
  }, [sortParam]);

  const updateParams = useCallback(
    (patch: Record<string, string | null>, resetPage = true) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "") next.delete(key);
            else next.set(key, value);
          }
          if (resetPage) next.delete("page");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // ── Data ──────────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ProductListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [searchInput, setSearchInput] = useState(search);
  const [reloadTick, setReloadTick] = useState(0);

  const [selected, setSelected] = useState<Array<string | number>>([]);
  const [bulkAction, setBulkAction] = useState<BulkActionKey>("");
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setSearchInput(search), [search]);

  useEffect(() => {
    dashboardApi.get<CategoryOption[]>("/api/admin/categories").then(setCategories).catch(() => {});
    dashboardApi.get<Brand[]>("/api/admin/brands").then(setBrands).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    qs.set("sort", sortParam);
    if (search) qs.set("search", search);
    if (categoryId) qs.set("categoryId", categoryId);
    if (brandId) qs.set("brandId", brandId);
    if (catalogStatus) qs.set("catalogStatus", catalogStatus);
    if (published) qs.set("published", published);

    dashboardApi
      .get<ProductsListResponse>(`/api/admin/products?${qs.toString()}`)
      .then((d) => {
        if (cancelled) return;
        setRows(d.items);
        setTotal(d.total);
        setErr(null);
      })
      .catch((e) => {
        if (!cancelled) setErr(formatError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- formatError is locale-only
  }, [page, pageSize, sortParam, search, categoryId, brandId, catalogStatus, published, reloadTick]);

  const reload = () => setReloadTick((n) => n + 1);

  // ── Filters ───────────────────────────────────────────────────────────────
  const applySearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    updateParams({ search: searchInput.trim() || null });
  };

  const resetFilters = () => {
    setSearchInput("");
    updateParams({
      search: null,
      categoryId: null,
      brandId: null,
      catalogStatus: null,
      published: null,
    });
  };

  const anyFiltersActive = Boolean(search || categoryId || brandId || catalogStatus || published);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: t("products.allCategories") },
      ...categories.map((c) => ({
        value: String(c.id),
        label: lang === "ar" ? c.nameAr || c.nameEn : c.nameEn,
      })),
    ],
    [categories, lang, t],
  );

  const brandOptions = useMemo(
    () => [
      { value: "", label: t("products.allBrands") },
      ...brands.map((b) => ({
        value: String(b.id),
        label: lang === "ar" ? b.nameAr || b.nameEn : b.nameEn,
      })),
    ],
    [brands, lang, t],
  );

  const statusOptions = [
    { value: "", label: t("products.anyStatus") },
    ...CATALOG_STATUSES.map((status) => ({ value: status, label: t(catalogStatusKey(status)) })),
  ];

  const publishedOptions = [
    { value: "", label: t("products.anyVisibility") },
    { value: "true", label: t("products.visPublished") },
    { value: "false", label: t("products.visDraft") },
  ];

  // ── Row actions ───────────────────────────────────────────────────────────
  const togglePublished = async (row: ProductListRow) => {
    try {
      await dashboardApi.patch(`/api/admin/products/${row.id}`, { published: !row.published });
      toast.success(row.published ? t("products.hiddenToast") : t("products.publishedToast"));
      reload();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const onDuplicate = async (row: ProductListRow) => {
    try {
      const res = await productEditorApi.duplicate(row.id);
      toast.success(t("products.duplicatedToast"));
      navigate(`/admin/products/${res.id}`);
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const onDelete = async (row: ProductListRow) => {
    const ok = await confirm({
      title: t("products.deleteTitle"),
      message: t("products.deleteMessage", { name: lang === "ar" ? row.nameAr || row.nameEn : row.nameEn }),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await productEditorApi.softDelete(row.id);
      toast.success(t("products.deletedToast"));
      reload();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  // ── Bulk ──────────────────────────────────────────────────────────────────
  const bulkOptions = [
    { value: "", label: t("bulk.choose") },
    ...(Object.keys(BULK_LABEL_KEY) as Array<Exclude<BulkActionKey, "">>).map((key) => ({
      value: key,
      label: t(BULK_LABEL_KEY[key]),
    })),
  ];

  const describeSkipped = (skipped: NonNullable<ProductsBulkResponse["skipped"]>): string => {
    const byReason = new Map<string, number>();
    for (const row of skipped) byReason.set(row.reason, (byReason.get(row.reason) ?? 0) + 1);
    const parts: string[] = [];
    for (const [reason, count] of byReason) {
      if (reason === "invalid_transition") parts.push(t("bulk.skipInvalid", { count }));
      else if (reason === "forbidden_transition") parts.push(t("bulk.skipForbidden", { count }));
      else if (reason === "not_found") parts.push(t("bulk.skipNotFound", { count }));
      else parts.push(`${count} × ${reason}`);
    }
    return parts.join(" · ");
  };

  const runBulk = async () => {
    if (!bulkAction || selected.length === 0) return;
    const ids = selected.map((k) => Number(k)).filter((n) => Number.isFinite(n));

    let payload: ProductsBulkPayload | null = null;
    let pricePayload: Parameters<typeof productsBulkPriceApi.run>[0] | null = null;

    if (
      bulkAction === "publish" ||
      bulkAction === "unpublish" ||
      bulkAction === "soft_delete" ||
      bulkAction === "restore"
    ) {
      payload = { action: bulkAction, ids };
    } else if (bulkAction === "change_category") {
      const target = parseInt(bulkTarget, 10);
      if (!Number.isFinite(target) || target <= 0) {
        toast.error(t("bulk.targetRequired"));
        return;
      }
      payload = { action: "change_category", ids, categoryId: target };
    } else if (bulkAction === "change_brand") {
      if (bulkTarget === "") {
        toast.error(t("bulk.targetRequired"));
        return;
      }
      payload = {
        action: "change_brand",
        ids,
        brandId: bulkTarget === "null" ? null : parseInt(bulkTarget, 10),
      };
    } else if (bulkAction === "catalog_status") {
      if (!bulkTarget) {
        toast.error(t("bulk.targetRequired"));
        return;
      }
      payload = { action: "catalog_status", ids, catalogStatus: bulkTarget as ProductCatalogStatus };
    } else {
      const value = Number(bulkValue);
      if (!bulkValue.trim() || !Number.isFinite(value)) {
        toast.error(t("bulk.valueRequired"));
        return;
      }
      if (bulkAction === "price_percent") pricePayload = { action: "price_percent", ids, percent: value };
      else if (bulkAction === "price_fixed_delta") pricePayload = { action: "price_fixed_delta", ids, delta: value };
      else pricePayload = { action: "price_set", ids, price: value };
    }

    const ok = await confirm({
      title: t("bulk.confirmTitle"),
      message: t("bulk.confirmMessage", { action: t(BULK_LABEL_KEY[bulkAction]), count: ids.length }),
      tone: bulkAction === "soft_delete" ? "danger" : "default",
    });
    if (!ok) return;

    setBulkRunning(true);
    try {
      const res = payload ? await productsBulkApi.run(payload) : await productsBulkPriceApi.run(pricePayload!);
      const skipped = "skipped" in res && res.skipped?.length ? res.skipped : null;
      const summary = skipped
        ? `${t("bulk.doneAffected", { count: res.affected })} ${t("bulk.doneSkipped", {
            count: skipped.length,
            reasons: describeSkipped(skipped),
          })}`
        : t("bulk.doneAffected", { count: res.affected });
      if (skipped) toast.info(summary);
      else toast.success(summary);
      setSelected([]);
      setBulkAction("");
      setBulkTarget("");
      setBulkValue("");
      reload();
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setBulkRunning(false);
    }
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { blob, filename } = await productsCsvApi.export({
        search: search || undefined,
        categoryId: categoryId ? parseInt(categoryId, 10) : undefined,
        brandId: brandId ? parseInt(brandId, 10) : undefined,
        catalogStatus: (catalogStatus || undefined) as ProductCatalogStatus | undefined,
        status: published === "true" ? "published" : published === "false" ? "draft" : undefined,
        sort: sortParam,
        limit: 2000,
      });
      saveBlobAsFile(blob, filename);
      toast.success(t("products.exportDone", { filename }));
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setExporting(false);
    }
  };

  // ── Bulk target control ───────────────────────────────────────────────────
  const needsTargetSelect =
    bulkAction === "change_category" || bulkAction === "change_brand" || bulkAction === "catalog_status";
  const needsValue =
    bulkAction === "price_percent" || bulkAction === "price_fixed_delta" || bulkAction === "price_set";

  const bulkTargetOptions =
    bulkAction === "change_category"
      ? [{ value: "", label: t("bulk.pickCategory") }, ...categoryOptions.slice(1)]
      : bulkAction === "change_brand"
        ? [
            { value: "", label: t("bulk.pickBrand") },
            { value: "null", label: t("bulk.clearBrand") },
            ...brandOptions.slice(1),
          ]
        : [
            { value: "", label: t("bulk.pickStatus") },
            ...CATALOG_STATUSES.map((status) => ({ value: status, label: t(catalogStatusKey(status)) })),
          ];

  const bulkValuePlaceholder =
    bulkAction === "price_percent"
      ? t("bulk.percentPlaceholder")
      : bulkAction === "price_fixed_delta"
        ? t("bulk.deltaPlaceholder")
        : t("bulk.pricePlaceholder");

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("products.title")}</h1>
          <div className="dashboard-page-subtitle">{t("products.subtitle")}</div>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" onClick={() => navigate("/admin/products/review")}>
            <ClipboardCheck size={15} aria-hidden /> {t("products.reviewQueue")}
          </Button>
          <Button variant="secondary" onClick={() => navigate("/admin/products/import")}>
            <Upload size={15} aria-hidden /> {t("products.import")}
          </Button>
          <Button variant="secondary" loading={exporting} onClick={() => void exportCsv()}>
            <Download size={15} aria-hidden /> {t("products.export")}
          </Button>
          <Button onClick={() => navigate("/admin/products/new")}>
            <Plus size={15} aria-hidden /> {t("products.new")}
          </Button>
        </div>
      </div>

      <Card tight>
        <form onSubmit={applySearch} className={s.filtersForm}>
          <Field label={t("products.searchLabel")}>
            <Input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("products.searchPlaceholder")}
            />
          </Field>
          <Field label={t("products.filterCategory")}>
            <Select
              value={categoryId}
              onChange={(e) => updateParams({ categoryId: (e.target as HTMLSelectElement).value || null })}
              options={categoryOptions}
            />
          </Field>
          <Field label={t("products.filterBrand")}>
            <Select
              value={brandId}
              onChange={(e) => updateParams({ brandId: (e.target as HTMLSelectElement).value || null })}
              options={brandOptions}
            />
          </Field>
          <Field label={t("products.filterStatus")}>
            <Select
              value={catalogStatus}
              onChange={(e) => updateParams({ catalogStatus: (e.target as HTMLSelectElement).value || null })}
              options={statusOptions}
            />
          </Field>
          <Field label={t("products.filterVisibility")}>
            <Select
              value={published}
              onChange={(e) => updateParams({ published: (e.target as HTMLSelectElement).value || null })}
              options={publishedOptions}
            />
          </Field>
          <div className={s.filtersButtons}>
            <Button type="submit" variant="primary">
              {t("common.apply")}
            </Button>
            {anyFiltersActive && (
              <Button type="button" variant="ghost" onClick={resetFilters}>
                {t("common.reset")}
              </Button>
            )}
          </div>
        </form>

        {selected.length > 0 && (
          <div className={s.bulkBar}>
            <span className={s.bulkCount}>{t("table.selectedCount", { count: selected.length })}</span>
            <span className={s.bulkControl}>
              <Select
                aria-label={t("bulk.actionLabel")}
                value={bulkAction}
                onChange={(e) => {
                  setBulkAction((e.target as HTMLSelectElement).value as BulkActionKey);
                  setBulkTarget("");
                  setBulkValue("");
                }}
                options={bulkOptions}
              />
            </span>
            {needsTargetSelect && (
              <span className={s.bulkControl}>
                <Select
                  aria-label={t(BULK_LABEL_KEY[bulkAction as Exclude<BulkActionKey, "">])}
                  value={bulkTarget}
                  onChange={(e) => setBulkTarget((e.target as HTMLSelectElement).value)}
                  options={bulkTargetOptions}
                />
              </span>
            )}
            {needsValue && (
              <span className={s.bulkValue}>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={bulkValue}
                  placeholder={bulkValuePlaceholder}
                  onChange={(e) => setBulkValue(e.target.value)}
                />
              </span>
            )}
            <Button size="sm" loading={bulkRunning} disabled={!bulkAction} onClick={() => void runBulk()}>
              {t("common.apply")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
              {t("table.clearSelection")}
            </Button>
          </div>
        )}

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div className={s.errorBox}>{err}</div>
        ) : (
          <Table
            rowKey={(r) => r.id}
            rows={rows}
            selectable
            selected={selected}
            onSelectedChange={setSelected}
            sort={sort}
            onSortChange={(next) => updateParams({ sort: `${next.key}_${next.dir}` }, false)}
            empty={anyFiltersActive ? t("products.emptyFiltered") : t("products.empty")}
            pagination={{
              page,
              pageSize,
              total,
              onPageChange: (next) => updateParams({ page: String(next) }, false),
              onPageSizeChange: (next) => updateParams({ pageSize: String(next) }),
            }}
            columns={[
              {
                header: "",
                width: "60px",
                cell: (r) => (
                  <span className={s.thumb}>
                    {r.images[0]?.url ? (
                      <img src={resolveUploadUrl(r.images[0].url)} alt={r.nameEn} />
                    ) : (
                      <Package size={18} aria-hidden />
                    )}
                  </span>
                ),
              },
              {
                header: t("products.colProduct"),
                sortKey: "name",
                cell: (r) => (
                  <div>
                    <Link to={`/admin/products/${r.id}`} className={s.cellTitle}>
                      {lang === "ar" ? r.nameAr || r.nameEn : r.nameEn}
                    </Link>
                    <div className={s.cellSub}>
                      #{r.id}
                      {r.sku && r.sku !== "—" ? ` · SKU ${r.sku}` : ""}
                    </div>
                  </div>
                ),
              },
              {
                header: t("products.colCategory"),
                cell: (r) => (
                  <span className={s.cellSoft}>{lang === "ar" ? r.category.nameAr : r.category.nameEn}</span>
                ),
              },
              {
                header: t("products.colBrand"),
                cell: (r) => (
                  <span className={s.cellSoft}>
                    {r.brandRef
                      ? lang === "ar"
                        ? r.brandRef.nameAr
                        : r.brandRef.nameEn
                      : r.brand && r.brand !== "—"
                        ? r.brand
                        : "—"}
                  </span>
                ),
              },
              {
                header: t("products.colPrice"),
                sortKey: "price",
                align: "end",
                mono: true,
                cell: (r) => (
                  <div>
                    <div>{formatIqd(r.price, lang)}</div>
                    {r.oldPrice ? <div className={s.strike}>{formatIqd(r.oldPrice, lang)}</div> : null}
                  </div>
                ),
              },
              {
                header: t("products.colStock"),
                sortKey: "quantity",
                width: "90px",
                align: "end",
                mono: true,
                cell: (r) => (
                  <span className={r.quantity <= 0 ? s.stockDanger : r.quantity < 5 ? s.stockWarning : undefined}>
                    {r.quantity}
                  </span>
                ),
              },
              {
                header: t("products.colStatus"),
                width: "110px",
                cell: (r) => (
                  <div className={s.statusCell}>
                    <Badge tone={CATALOG_STATUS_TONE[r.catalogStatus]}>{t(catalogStatusKey(r.catalogStatus))}</Badge>
                    <span className={s.statusSub}>
                      {r.published ? t("products.visible") : t("products.hidden")}
                    </span>
                  </div>
                ),
              },
              {
                header: "",
                cell: (r) => (
                  <div className={s.rowActions}>
                    <Button size="sm" variant="secondary" onClick={() => void togglePublished(r)}>
                      {r.published ? t("products.rowHide") : t("products.rowPublish")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/products/${r.id}`)}>
                      {t("products.rowEdit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void onDuplicate(r)}>
                      {t("products.rowDuplicate")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t("products.rowDelete")}
                      onClick={() => void onDelete(r)}
                    >
                      ✕
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
    </>
  );
}

export default DashboardProductsPage;
