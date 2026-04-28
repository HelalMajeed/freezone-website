"use client";

import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import type { AdminProductRow } from "./admin-product-types";
import { brandLabel, formatIqd } from "./admin-product-types";
import { AdminProductStars } from "./AdminProductStars";
import styles from "./admin-product-quick-view.module.css";

type Props = {
  product: AdminProductRow;
  displayName: string;
  displayDescFull: string;
  storefrontUrl: string;
  editUrl: string;
  onClose: () => void;
};

export function AdminProductQuickView({ product: p, displayName, displayDescFull, storefrontUrl, editUrl, onClose }: Props) {
  const img = p.images[0]?.url;
  const br = brandLabel(p);

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="qv-title">
        <div className={styles.head}>
          <h2 id="qv-title">{displayName}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="إغلاق">
            ×
          </button>
        </div>
        <div className={styles.hero}>{img ? <img src={img} alt="" /> : null}</div>
        <div className={styles.body}>
          <div className={styles.meta}>
            #{p.id} · {p.category.nameAr || p.category.nameEn}
            {br ? ` · ${br}` : ""}
          </div>
          <AdminProductStars rating={p.rating} reviews={p.reviews} />
          <p className={styles.meta} style={{ fontWeight: 800, color: "var(--catalog-accent, #b51822)", fontSize: 20 }}>
            {formatIqd(p.price)}
            {p.oldPrice != null && p.oldPrice > p.price ? (
              <span style={{ textDecoration: "line-through", fontWeight: 600, fontSize: 14, marginInlineStart: 10, color: "var(--catalog-muted)" }}>
                {formatIqd(p.oldPrice)}
              </span>
            ) : null}
          </p>
          <p className={styles.desc}>{displayDescFull || "—"}</p>
          <div className={styles.footer}>
            <Link className={`${styles.btn} ${styles.btnPrimary}`} to={editUrl} onClick={onClose}>
              <Pencil size={16} aria-hidden />
              تعديل المنتج
            </Link>
            {p.published ? (
              <a
                className={`${styles.btn} ${styles.btnGhost}`}
                href={storefrontUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClose}
              >
                عرض في المتجر
              </a>
            ) : (
              <span
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ cursor: "default", opacity: 0.75 }}
                title="هذا المنتج مخفي عن العملاء. ألغِ «إخفاء من المتجر» في البطاقة لإظهاره في المتجر."
              >
                غير معروض في المتجر
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
