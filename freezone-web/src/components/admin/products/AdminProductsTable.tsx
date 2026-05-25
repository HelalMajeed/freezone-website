"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { brandLabel, formatIqd } from "@/components/admin/products-catalog/admin-product-types";
import { stockWorkflowStatus } from "@/lib/admin/admin-product-tab-status";
import {
  bulkAdminProductsAction,
  duplicateAdminProduct,
  fetchAdminProductsList,
  productsExportUrl,
  type AdminProductsListParams,
  type CatalogStatusFilter,
} from "@/lib/admin/admin-products-api";
import { loadSavedProductFilters, saveProductFilter, type SavedProductFilter } from "@/lib/admin/saved-product-filters";
import { formatAdminDate, productQualityHints } from "@/lib/admin/product-row-quality-hint";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { BulkPriceModal } from "@/components/admin/BulkPriceModal";
import styles from "./AdminProductsTable.module.css";

type CategoryOpt = { id: number; nameEn: string; nameAr?: string; slug: string };
type BrandOpt = { id: number; nameAr: string; nameEn: string };

const DEFAULT_PARAMS: AdminProductsListParams = {
  page: 1,
  pageSize: 25,
  search: "",
  categoryId: "",
  published: "",
  stock: "",
  sort: "id_desc",
  catalogStatus: "",
  brandId: "",
  priceMin: "",
  priceMax: "",
  quantityMin: "",
  quantityMax: "",
};

const CATALOG_LABELS: Record<string, string> = {
  DRAFT: "مسودة",
  PENDING_REVIEW: "قيد المراجعة",
  CHANGES_REQUESTED: "تعديلات مطلوبة",
  PUBLISHED: "منشور",
  ARCHIVED: "مؤرشف",
};

function paramsFromSearch(sp: URLSearchParams): AdminProductsListParams {
  const publishedRaw = sp.get("published");
  let published: AdminProductsListParams["published"] = "";
  if (publishedRaw === "true" || publishedRaw === "published") published = "published";
  else if (publishedRaw === "false" || publishedRaw === "draft") published = "draft";

  const stockRaw = sp.get("stock");
  let stock: AdminProductsListParams["stock"] = "";
  if (stockRaw === "in") stock = "in";
  else if (stockRaw === "out") stock = "out";
  else if (stockRaw === "unset") stock = "unset";

  const catalogRaw = sp.get("catalogStatus") as CatalogStatusFilter | null;

  return {
    ...DEFAULT_PARAMS,
    page: Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1),
    published,
    stock,
    categoryId: sp.get("categoryId") ?? "",
    search: sp.get("search") ?? sp.get("q") ?? "",
    sort: sp.get("sort") ?? "id_desc",
    catalogStatus: catalogRaw && CATALOG_LABELS[catalogRaw] ? catalogRaw : "",
    brandId: sp.get("brandId") ?? "",
    priceMin: sp.get("priceMin") ?? "",
    priceMax: sp.get("priceMax") ?? "",
    quantityMin: sp.get("quantityMin") ?? "",
    quantityMax: sp.get("quantityMax") ?? "",
  };
}

export function AdminProductsTable({
  categories,
  lockedCategoryId,
}: {
  categories: CategoryOpt[];
  lockedCategoryId?: number;
}) {
  const user = useDashboardAuth((s) => s.user);
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => {
    const base = paramsFromSearch(searchParams);
    if (lockedCategoryId != null) {
      return { ...base, categoryId: String(lockedCategoryId) };
    }
    return base;
  }, [searchParams, lockedCategoryId]);
  const [params, setParams] = useState<AdminProductsListParams>(initial);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedProductFilter[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [smartCounts, setSmartCounts] = useState<Record<string, number>>({});
  const [density, setDensity] = useState<"compact" | "comfortable" | "spacious">("comfortable");
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);

  useEffect(() => {
    const next = paramsFromSearch(searchParams);
    if (lockedCategoryId != null) {
      setParams({ ...next, categoryId: String(lockedCategoryId) });
      return;
    }
    setParams(next);
  }, [searchParams, lockedCategoryId]);

  useEffect(() => {
    void fetch(freezoneApiUrl("/api/admin/products/smart-filters"), { credentials: "include" })
      .then((r) => r.json())
      .then((j: { data?: Record<string, number> }) => setSmartCounts(j.data ?? {}))
      .catch(() => setSmartCounts({}));
  }, []);

  useEffect(() => {
    setSavedFilters(loadSavedProductFilters(user?.id ?? null));
    void fetch(freezoneApiUrl("/api/admin/brands"), { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setBrands(Array.isArray(data) ? data : []))
      .catch(() => setBrands([]));
  }, [user?.id]);

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<Record<number, { price?: string; quantity?: string; catalogStatus?: string }>>(
    {},
  );
  const categoryHub = lockedCategoryId != null;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(params.search), 300);
    return () => window.clearTimeout(t);
  }, [params.search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchAdminProductsList({ ...params, search: debouncedSearch });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
      setSelected(new Set());
    } catch {
      setError("تعذّر تحميل المنتجات");
      setItems([]);
    }
    setLoading(false);
  }, [params, debouncedSearch]);

  useEffect(() => {
    void load();
  }, [load]);

  const setPage = (page: number) => setParams((p) => ({ ...p, page: Math.max(1, page) }));

  const patchParams = (patch: Partial<AdminProductsListParams>) => {
    setParams((p) => ({ ...p, ...patch, page: 1 }));
  };

  async function patchProduct(id: number, body: Record<string, unknown>) {
    setActingId(id);
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("failed");
      toast.success("تم التحديث");
      await load();
    } catch {
      setError("تعذّر تحديث المنتج");
      toast.error("تعذّر تحديث المنتج");
    } finally {
      setActingId(null);
    }
  }

  async function saveInline(p: AdminProductRow) {
    const d = inlineDraft[p.id];
    if (!d) return;
    const body: Record<string, unknown> = {};
    if (d.price != null && d.price !== "") body.price = parseInt(d.price, 10) || 0;
    if (d.quantity != null && d.quantity !== "") {
      const q = parseInt(d.quantity, 10) || 0;
      body.quantity = q;
      body.inStock = q > 0;
    }
    if (d.catalogStatus) {
      body.catalogStatus = d.catalogStatus;
      if (d.catalogStatus === "PUBLISHED") body.published = true;
      if (d.catalogStatus === "DRAFT" || d.catalogStatus === "ARCHIVED") body.published = false;
    }
    if (Object.keys(body).length) await patchProduct(p.id, body);
    setInlineDraft((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });
  }

  async function togglePublish(p: AdminProductRow) {
    const next = p.catalogStatus === "PUBLISHED" || p.published ? "DRAFT" : "PUBLISHED";
    await patchProduct(p.id, {
      catalogStatus: next,
      published: next === "PUBLISHED",
    });
  }

  async function safeDelete(p: AdminProductRow) {
    const label = p.nameAr || p.nameEn || `#${p.id}`;
    const ok = await confirmDialog({
      title: "حذف منتج",
      message: `لتأكيد الحذف الناعم، اكتب اسم المنتج بالضبط:`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      danger: true,
      confirmMatch: label,
      confirmMatchLabel: `اكتب: ${label}`,
    });
    if (!ok) return;
    setActingId(p.id);
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${p.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      toast.success("تم الحذف");
      await load();
    } catch {
      setError("تعذّر حذف المنتج");
      toast.error("تعذّر حذف المنتج");
    } finally {
      setActingId(null);
    }
  }

  async function duplicateProduct(p: AdminProductRow) {
    setActingId(p.id);
    try {
      const newId = await duplicateAdminProduct(p.id);
      toast.success(`تم النسخ — #${newId}`);
    } catch {
      toast.error("تعذّر النسخ");
    } finally {
      setActingId(null);
    }
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.id)));
  }

  async function runBulk(action: "publish" | "unpublish" | "soft_delete") {
    const ids = [...selected];
    if (!ids.length) return;
    const labels = { publish: "نشر", unpublish: "إلغاء النشر", soft_delete: "حذف ناعم" };
    const ok = await confirmDialog({
      title: "إجراء جماعي",
      message: `${labels[action]} على ${ids.length} منتج؟`,
      confirmLabel: labels[action],
      danger: action === "soft_delete",
    });
    if (!ok) return;
    try {
      const { affected } = await bulkAdminProductsAction(action, ids);
      toast.success(`تم على ${affected} منتج`);
      await load();
    } catch {
      toast.error("فشل الإجراء الجماعي");
    }
  }

  function handleSaveFilter() {
    const name = window.prompt("اسم الفلتر المحفوظ:");
    if (!name) return;
    const entry = saveProductFilter(user?.id ?? null, name, params);
    setSavedFilters((f) => [entry, ...f].slice(0, 20));
    toast.success("تم حفظ الفلتر");
  }

  return (
    <div className={styles.wrap}>
      <BulkPriceModal
        ids={[...selected]}
        open={bulkPriceOpen}
        onClose={() => setBulkPriceOpen(false)}
        onDone={() => void load()}
      />
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.input}
          placeholder="بحث: اسم، SKU، موديل، #id…"
          value={params.search}
          onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
        />
        {lockedCategoryId == null ? (
          <select
            className={styles.select}
            value={params.categoryId}
            onChange={(e) => patchParams({ categoryId: e.target.value })}
          >
            <option value="">كل الأقسام</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameEn}
              </option>
            ))}
          </select>
        ) : (
          <span className={styles.count}>
            قسم: {categories.find((c) => c.id === lockedCategoryId)?.nameAr || categories[0]?.nameEn}
          </span>
        )}
        <select
          className={styles.select}
          value={params.catalogStatus ?? ""}
          onChange={(e) => patchParams({ catalogStatus: e.target.value as CatalogStatusFilter })}
        >
          <option value="">كل حالات الكتالوج</option>
          {Object.entries(CATALOG_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={params.published}
          onChange={(e) => patchParams({ published: e.target.value as AdminProductsListParams["published"] })}
        >
          <option value="">منشور/مسودة (قديم)</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
        </select>
        <select
          className={styles.select}
          value={params.stock}
          onChange={(e) => patchParams({ stock: e.target.value as AdminProductsListParams["stock"] })}
        >
          <option value="">كل المخزون</option>
          <option value="in">متوفر</option>
          <option value="out">غير متوفر</option>
          <option value="unset">مخزون غير محدد</option>
        </select>
        <select
          className={styles.select}
          value={params.sort}
          onChange={(e) => patchParams({ sort: e.target.value })}
        >
          <option value="id_desc">الأحدث</option>
          <option value="updated_desc">آخر تحديث</option>
          <option value="id_asc">الأقدم</option>
          <option value="name_asc">الاسم A–Z</option>
          <option value="price_asc">السعر ↑</option>
          <option value="price_desc">السعر ↓</option>
        </select>
        <button type="button" className={styles.pageBtn} onClick={() => setShowAdvanced((v) => !v)}>
          {showAdvanced ? "إخفاء متقدم" : "فلاتر متقدمة"}
        </button>
        <select
          className={styles.select}
          value={params.pageSize}
          onChange={(e) => patchParams({ pageSize: Number(e.target.value), page: 1 })}
        >
          <option value={10}>10 / صفحة</option>
          <option value={25}>25 / صفحة</option>
          <option value={50}>50 / صفحة</option>
        </select>
        <span className={styles.count}>{total} منتج</span>
      </div>

      {showAdvanced ? (
        <div className={styles.filters}>
          <select
            className={styles.select}
            value={params.brandId ?? ""}
            onChange={(e) => patchParams({ brandId: e.target.value })}
          >
            <option value="">كل العلامات</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nameAr || b.nameEn}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            placeholder="سعر من"
            value={params.priceMin ?? ""}
            onChange={(e) => patchParams({ priceMin: e.target.value })}
          />
          <input
            className={styles.input}
            placeholder="سعر إلى"
            value={params.priceMax ?? ""}
            onChange={(e) => patchParams({ priceMax: e.target.value })}
          />
          <input
            className={styles.input}
            placeholder="كمية من"
            value={params.quantityMin ?? ""}
            onChange={(e) => patchParams({ quantityMin: e.target.value })}
          />
          <input
            className={styles.input}
            placeholder="كمية إلى"
            value={params.quantityMax ?? ""}
            onChange={(e) => patchParams({ quantityMax: e.target.value })}
          />
          <button type="button" className={styles.pageBtn} onClick={handleSaveFilter}>
            حفظ الفلتر
          </button>
          {savedFilters.length ? (
            <select
              className={styles.select}
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (!id) return;
                if (id === "__delete__") return;
                const f = savedFilters.find((x) => x.id === id);
                if (f) setParams((p) => ({ ...p, ...f.params, page: 1 }));
                e.target.value = "";
              }}
            >
              <option value="">فلاتر محفوظة</option>
              {savedFilters.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          ) : null}
        </div>
      ) : null}

      {selected.size > 0 ? (
        <div className={styles.bulkBar}>
          <span>{selected.size} محدد</span>
          <button type="button" className={styles.pageBtn} onClick={() => void runBulk("publish")}>
            نشر جماعي
          </button>
          <button type="button" className={styles.pageBtn} onClick={() => void runBulk("unpublish")}>
            إلغاء نشر
          </button>
          <button type="button" className={styles.pageBtn} onClick={() => setBulkPriceOpen(true)}>
            تعديل سعر جماعي
          </button>
          <button type="button" className={`${styles.pageBtn} ${styles.actionDanger}`} onClick={() => void runBulk("soft_delete")}>
            حذف ناعم
          </button>
          <a
            className={styles.actionLink}
            href={productsExportUrl({ ...params, search: debouncedSearch })}
            download
          >
            تصدير CSV (الفلتر الحالي)
          </a>
        </div>
      ) : (
        <div className={styles.filters}>
          <a
            className={styles.actionLink}
            href={productsExportUrl({ ...params, search: debouncedSearch })}
            download
          >
            تصدير CSV
          </a>
        </div>
      )}

      <div className={styles.filters} style={{ marginTop: 0 }}>
        {(
          [
            ["no_images", "بدون صور", "🔴"],
            ["no_desc", "بدون وصف", "🟠"],
            ["ready_publish", "جاهز للنشر", "🟢"],
            ["low_stock", "مخزون منخفض", "⚠️"],
            ["zero_price", "سعر = 0", "💰"],
          ] as const
        ).map(([key, label, icon]) => (
          <button
            key={key}
            type="button"
            className={styles.pageBtn}
            onClick={() => patchParams({ smartFilter: key })}
          >
            {icon} {label} ({smartCounts[key] ?? 0})
          </button>
        ))}
        <select
          className={styles.select}
          value={density}
          onChange={(e) => setDensity(e.target.value as typeof density)}
        >
          <option value="compact">مدمج</option>
          <option value="comfortable">مريح</option>
          <option value="spacious">واسع</option>
        </select>
      </div>

      {error ? <p className={styles.muted}>{error}</p> : null}
      {loading ? (
        <TableSkeleton rows={density === "compact" ? 14 : 8} cols={8} />
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selected.size === items.length}
                    onChange={toggleSelectAll}
                    aria-label="تحديد الكل"
                  />
                </th>
                <th>صورة</th>
                <th>{categoryHub ? "المنتج" : "الاسم"}</th>
                <th>SKU</th>
                {!categoryHub ? <th>القسم</th> : null}
                {!categoryHub ? <th>العلامة</th> : null}
                <th>السعر</th>
                <th>المخزون</th>
                <th>حالة الكتالوج</th>
                {categoryHub ? <th>جودة البيانات</th> : null}
                {categoryHub ? <th>آخر تحديث</th> : null}
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const thumb = p.images[0]?.url;
                const stock = stockWorkflowStatus(p.inStock, p.quantity ?? 0);
                const stockLabel =
                  stock === "in" ? `متوفر (${p.quantity})` : stock === "out" ? "غير متوفر" : "غير محدد";
                const hints = productQualityHints(p);
                const busy = actingId === p.id;
                const draft = inlineDraft[p.id];
                const status = p.catalogStatus ?? (p.published ? "PUBLISHED" : "DRAFT");
                return (
                  <tr key={p.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={() => toggleSelect(p.id)}
                        aria-label={`تحديد ${p.id}`}
                      />
                    </td>
                    <td>
                      {thumb ? (
                        <img src={thumb} alt="" className={styles.thumb} />
                      ) : (
                        <span className={styles.thumbPlaceholder}>{p.icon || "📦"}</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.nameCell}>
                        <strong>{p.nameEn || p.nameAr}</strong>
                        <span className={styles.sub}>#{p.id}</span>
                      </div>
                    </td>
                    <td className={styles.mono}>{p.sku && p.sku !== "—" ? p.sku : "—"}</td>
                    {!categoryHub ? <td>{p.category.nameEn}</td> : null}
                    {!categoryHub ? <td>{brandLabel(p) || "—"}</td> : null}
                    <td>
                      <input
                        className={styles.inlineInput}
                        type="number"
                        defaultValue={p.price}
                        onChange={(e) =>
                          setInlineDraft((d) => ({
                            ...d,
                            [p.id]: { ...d[p.id], price: e.target.value },
                          }))
                        }
                        onBlur={() => void saveInline(p)}
                        disabled={busy}
                      />
                    </td>
                    <td>
                      <input
                        className={styles.inlineInput}
                        type="number"
                        defaultValue={p.quantity}
                        style={{ width: 64 }}
                        onChange={(e) =>
                          setInlineDraft((d) => ({
                            ...d,
                            [p.id]: { ...d[p.id], quantity: e.target.value },
                          }))
                        }
                        onBlur={() => void saveInline(p)}
                        disabled={busy}
                      />
                      <span
                        className={
                          stock === "in" ? styles.badgeIn : stock === "out" ? styles.badgeOut : styles.badgeUnset
                        }
                      >
                        {stockLabel}
                      </span>
                    </td>
                    <td>
                      <select
                        className={styles.inlineSelect}
                        value={draft?.catalogStatus ?? status}
                        onChange={(e) => {
                          const v = e.target.value;
                          setInlineDraft((d) => ({ ...d, [p.id]: { ...d[p.id], catalogStatus: v } }));
                          void patchProduct(p.id, {
                            catalogStatus: v,
                            published: v === "PUBLISHED",
                          });
                        }}
                        disabled={busy}
                      >
                        {Object.entries(CATALOG_LABELS).map(([k, lab]) => (
                          <option key={k} value={k}>
                            {lab}
                          </option>
                        ))}
                      </select>
                    </td>
                    {categoryHub ? (
                      <td>
                        {hints.length ? (
                          <span className={styles.badgeWarn}>{hints.join(" · ")}</span>
                        ) : (
                          <span className={styles.badgeOk}>جيد</span>
                        )}
                      </td>
                    ) : null}
                    {categoryHub ? (
                      <td className={styles.mono}>{formatAdminDate(p.updatedAt ?? p.createdAt)}</td>
                    ) : null}
                    <td>
                      <div className={styles.actions}>
                        <Link to={`/admin/products/edit/${p.id}`} className={styles.actionLink}>
                          تعديل
                        </Link>
                        <a href={`/ar/product/${p.id}`} target="_blank" rel="noreferrer" className={styles.actionLink}>
                          معاينة
                        </a>
                        <button
                          type="button"
                          className={styles.actionLink}
                          disabled={busy}
                          onClick={() => void duplicateProduct(p)}
                        >
                          نسخ
                        </button>
                        <button
                          type="button"
                          className={styles.actionLink}
                          disabled={busy}
                          onClick={() => void togglePublish(p)}
                        >
                          {status === "PUBLISHED" ? "إلغاء نشر" : "نشر"}
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionLink} ${styles.actionDanger}`}
                          disabled={busy}
                          onClick={() => void safeDelete(p)}
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 ? <p className={styles.muted}>لا توجد منتجات.</p> : null}
        </div>
      )}

      <div className={styles.pagination}>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={params.page <= 1 || loading}
          onClick={() => setPage(params.page - 1)}
        >
          السابق
        </button>
        <span className={styles.pageInfo}>
          صفحة {params.page} من {totalPages}
        </span>
        <button
          type="button"
          className={styles.pageBtn}
          disabled={params.page >= totalPages || loading}
          onClick={() => setPage(params.page + 1)}
        >
          التالي
        </button>
      </div>
    </div>
  );
}
