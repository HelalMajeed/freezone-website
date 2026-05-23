"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { brandLabel, formatIqd } from "@/components/admin/products-catalog/admin-product-types";
import { stockWorkflowStatus } from "@/lib/admin/admin-product-tab-status";
import {
  fetchAdminProductsList,
  type AdminProductsListParams,
} from "@/lib/admin/admin-products-api";
import { formatAdminDate, productQualityHints } from "@/lib/admin/product-row-quality-hint";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";
import styles from "./AdminProductsTable.module.css";

type CategoryOpt = { id: number; nameEn: string; nameAr?: string; slug: string };

const DEFAULT_PARAMS: AdminProductsListParams = {
  page: 1,
  pageSize: 25,
  search: "",
  categoryId: "",
  published: "",
  stock: "",
  sort: "id_desc",
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

  return {
    ...DEFAULT_PARAMS,
    page: Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1),
    published,
    stock,
    categoryId: sp.get("categoryId") ?? "",
    search: sp.get("search") ?? sp.get("q") ?? "",
  };
}

export function AdminProductsTable({
  categories,
  lockedCategoryId,
}: {
  categories: CategoryOpt[];
  lockedCategoryId?: number;
}) {
  const [searchParams] = useSearchParams();
  const initial = useMemo(() => {
    const base = paramsFromSearch(searchParams);
    if (lockedCategoryId != null) {
      return { ...base, categoryId: String(lockedCategoryId) };
    }
    return base;
  }, [searchParams, lockedCategoryId]);
  const [params, setParams] = useState<AdminProductsListParams>(initial);

  useEffect(() => {
    const next = paramsFromSearch(searchParams);
    if (lockedCategoryId != null) {
      setParams({ ...next, categoryId: String(lockedCategoryId) });
      return;
    }
    setParams(next);
  }, [searchParams, lockedCategoryId]);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actingId, setActingId] = useState<number | null>(null);
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
      await load();
    } catch {
      setError("تعذّر تحديث المنتج");
    } finally {
      setActingId(null);
    }
  }

  async function togglePublish(p: AdminProductRow) {
    await patchProduct(p.id, { published: !p.published });
  }

  async function safeDelete(p: AdminProductRow) {
    const label = p.nameAr || p.nameEn || `#${p.id}`;
    const ok = await confirmDialog({
      title: "حذف منتج",
      message: `حذف المنتج «${label}» نهائيًا؟ لا يمكن التراجع.`,
      confirmLabel: "حذف",
      cancelLabel: "إلغاء",
      danger: true,
    });
    if (!ok) return;
    setActingId(p.id);
    try {
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${p.id}`), {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("failed");
      await load();
    } catch {
      setError("تعذّر حذف المنتج");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div className={styles.wrap}>
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
          value={params.published}
          onChange={(e) => patchParams({ published: e.target.value as AdminProductsListParams["published"] })}
        >
          <option value="">كل الحالات</option>
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
          <option value="id_asc">الأقدم</option>
          <option value="name_asc">الاسم A–Z</option>
          <option value="price_asc">السعر ↑</option>
          <option value="price_desc">السعر ↓</option>
        </select>
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

      {error ? <p className={styles.muted}>{error}</p> : null}
      {loading ? (
        <p className={styles.muted}>جاري التحميل…</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>صورة</th>
                <th>{categoryHub ? "المنتج" : "الاسم"}</th>
                <th>SKU</th>
                {!categoryHub ? <th>القسم</th> : null}
                {!categoryHub ? <th>العلامة</th> : null}
                <th>السعر</th>
                <th>المخزون</th>
                <th>حالة المنتج</th>
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
                return (
                  <tr key={p.id}>
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
                    <td>{formatIqd(p.price)}</td>
                    <td>
                      <span
                        className={
                          stock === "in" ? styles.badgeIn : stock === "out" ? styles.badgeOut : styles.badgeUnset
                        }
                      >
                        {stockLabel}
                      </span>
                    </td>
                    <td>
                      <span className={p.published ? styles.badgePub : styles.badgeDraft}>
                        {p.published ? "منشور" : "مسودة"}
                      </span>
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
                        {categoryHub ? (
                          <button
                            type="button"
                            className={styles.actionLink}
                            disabled={busy}
                            onClick={() => void togglePublish(p)}
                          >
                            {p.published ? "تعطيل" : "نشر"}
                          </button>
                        ) : null}
                        {categoryHub ? (
                          <button
                            type="button"
                            className={`${styles.actionLink} ${styles.actionDanger}`}
                            disabled={busy}
                            onClick={() => void safeDelete(p)}
                          >
                            حذف
                          </button>
                        ) : null}
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
