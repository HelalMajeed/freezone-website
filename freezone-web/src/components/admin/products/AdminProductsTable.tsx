"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { brandLabel, formatIqd } from "@/components/admin/products-catalog/admin-product-types";
import {
  fetchAdminProductsList,
  type AdminProductsListParams,
} from "@/lib/admin/admin-products-api";
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

export function AdminProductsTable({ categories }: { categories: CategoryOpt[] }) {
  const [params, setParams] = useState<AdminProductsListParams>(DEFAULT_PARAMS);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<AdminProductRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          <option value="">المخزون</option>
          <option value="in">متوفر</option>
          <option value="out">غير متوفر</option>
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
                <th>الاسم</th>
                <th>SKU</th>
                <th>القسم</th>
                <th>العلامة</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const thumb = p.images[0]?.url;
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
                    <td>{p.category.nameEn}</td>
                    <td>{brandLabel(p) || "—"}</td>
                    <td>{formatIqd(p.price)}</td>
                    <td>
                      <span className={p.inStock ? styles.badgeIn : styles.badgeOut}>
                        {p.inStock ? `${p.quantity}` : "نفد"}
                      </span>
                    </td>
                    <td>
                      <span className={p.published ? styles.badgePub : styles.badgeDraft}>
                        {p.published ? "منشور" : "مسودة"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link to={`/admin/products/edit/${p.id}`} className={styles.actionLink}>
                          تعديل
                        </Link>
                        <a href={`/en/product/${p.id}`} target="_blank" rel="noreferrer" className={styles.actionLink}>
                          عرض
                        </a>
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
