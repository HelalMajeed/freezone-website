"use client";

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { adminProductInCategory, brandLabel, formatIqd } from "@/components/admin/products-catalog/admin-product-types";
import styles from "./AdminProductsTable.module.css";

type CategoryOpt = { id: number; nameEn: string; nameAr?: string; slug: string };

type Props = {
  products: AdminProductRow[];
  categories: CategoryOpt[];
  loading?: boolean;
  onRefresh?: () => void;
};

export function AdminProductsTable({ products, categories, loading }: Props) {
  const [q, setQ] = useState("");
  const [catId, setCatId] = useState("");
  const [status, setStatus] = useState<"" | "published" | "draft">("");
  const [stock, setStock] = useState<"" | "in" | "out">("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cid = catId ? Number(catId) : null;
    return products.filter((p) => {
      if (cid != null && Number.isFinite(cid) && !adminProductInCategory(p, cid)) return false;
      if (status === "published" && !p.published) return false;
      if (status === "draft" && p.published) return false;
      if (stock === "in" && !p.inStock) return false;
      if (stock === "out" && p.inStock) return false;
      if (!needle) return true;
      const hay = `${p.nameEn} ${p.nameAr} ${p.brand} ${p.id}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [products, q, catId, status, stock]);

  return (
    <div className={styles.wrap}>
      <div className={styles.filters}>
        <input
          type="search"
          className={styles.input}
          placeholder="بحث: اسم، SKU، موديل…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className={styles.select} value={catId} onChange={(e) => setCatId(e.target.value)}>
          <option value="">كل الأقسام</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nameEn}
            </option>
          ))}
        </select>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="">كل الحالات</option>
          <option value="published">منشور</option>
          <option value="draft">مسودة</option>
        </select>
        <select className={styles.select} value={stock} onChange={(e) => setStock(e.target.value as typeof stock)}>
          <option value="">المخزون</option>
          <option value="in">متوفر</option>
          <option value="out">غير متوفر</option>
        </select>
        <span className={styles.count}>{filtered.length} منتج</span>
      </div>

      {loading ? (
        <p className={styles.muted}>جاري التحميل…</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>صورة</th>
                <th>الاسم</th>
                <th>القسم</th>
                <th>العلامة</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
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
          {filtered.length === 0 ? <p className={styles.muted}>لا توجد منتجات.</p> : null}
        </div>
      )}
    </div>
  );
}
