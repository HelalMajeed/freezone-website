"use client";

import { Link } from "react-router-dom";
import { Eye, Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import type { AdminProductRow } from "./admin-product-types";
import { brandLabel, formatIqd } from "./admin-product-types";
import styles from "./admin-product-card.module.css";

type Props = {
  product: AdminProductRow;
  displayName: string;
  view: "grid" | "list";
  wishlisted: boolean;
  onToggleWishlist: () => void;
  onQuickView: () => void;
  whatsappHref: string | null;
  storefrontUrl: string;
  editUrl: string;
  onPatch: (id: number, body: { inStock?: boolean; published?: boolean }) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
  busy?: boolean;
};

function stockOk(p: AdminProductRow): boolean {
  return p.inStock && p.quantity > 0;
}

export function AdminProductCard({
  product: p,
  displayName,
  view,
  wishlisted,
  onToggleWishlist,
  onQuickView,
  whatsappHref,
  storefrontUrl,
  editUrl,
  onPatch,
  onDelete,
  busy = false,
}: Props) {
  const img = p.images[0]?.url;
  const onSale = p.oldPrice != null && p.oldPrice > p.price;
  const hot = p.sales >= 40;
  const br = brandLabel(p);
  const qty = Math.max(0, Math.floor(Number(p.quantity) || 0));

  return (
    <article className={`${styles.card} ${view === "list" ? styles.cardList : ""}`}>
      <div className={styles.media}>
        {img ? (
          <img src={img} alt="" loading="lazy" decoding="async" sizes="(max-width: 640px) 100vw, 280px" />
        ) : (
          <div className={styles.placeholder} aria-hidden>
            {p.icon?.trim() || "📦"}
          </div>
        )}
        <div className={styles.badges}>
          {!p.published ? (
            <span className={`${styles.badge} ${styles.badgeHidden}`} title="مخفي عن واجهة المتجر">
              مخفي
            </span>
          ) : null}
          {onSale ? (
            <span className={`${styles.badge} ${styles.badgeSale}`}>
              خصم
            </span>
          ) : null}
          {p.isNew ? <span className={`${styles.badge} ${styles.badgeNew}`}>جديد</span> : null}
          {hot ? <span className={`${styles.badge} ${styles.badgeHot}`}>الأكثر مبيعاً</span> : null}
          {p.featured ? <span className={`${styles.badge} ${styles.badgeFeat}`}>مميز</span> : null}
        </div>
        <div className={styles.iconRow}>
          <button
            type="button"
            className={`${styles.iconBtn} ${wishlisted ? styles.iconBtnOn : ""}`}
            onClick={onToggleWishlist}
            aria-pressed={wishlisted}
            aria-label={wishlisted ? "إزالة من المفضلة" : "إضافة للمفضلة"}
          >
            <Heart size={16} fill={wishlisted ? "currentColor" : "none"} strokeWidth={2} />
          </button>
          <button type="button" className={styles.iconBtn} onClick={onQuickView} aria-label="معاينة سريعة">
            <Eye size={16} strokeWidth={2} />
          </button>
        </div>
        <div className={styles.overlayActions}>
          <Link className={styles.btn} to={editUrl} style={{ flex: "1 1 auto", minWidth: 100 }}>
            <Pencil size={14} aria-hidden />
            تعديل
          </Link>
          <a className={styles.btn} href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            عرض
          </a>
        </div>
      </div>

      <div className={styles.body}>
        <span className={styles.cat}>
          {p.category.nameAr || p.category.nameEn}
          {p.secondaryCategoryIds?.length ? (
            <span style={{ opacity: 0.75 }}> · +{p.secondaryCategoryIds.length}</span>
          ) : null}
        </span>
        <h3 className={styles.title}>{displayName}</h3>
        {br ? (
          <span className={styles.cat} style={{ textTransform: "none", letterSpacing: 0 }}>
            {br}
          </span>
        ) : null}
        <div className={styles.metaRow}>
          <div className={styles.priceBlock}>
            <span className={styles.price}>{formatIqd(p.price)}</span>
            {onSale ? <span className={styles.oldPrice}>{formatIqd(p.oldPrice!)}</span> : null}
          </div>
          <span className={stockOk(p) ? styles.stockIn : styles.stockOut} title={`الكمية في قاعدة البيانات: ${qty.toLocaleString("ar-IQ")}`}>
            {stockOk(p) ? `متوفر (${qty.toLocaleString("ar-IQ")})` : `غير متوفر (${qty.toLocaleString("ar-IQ")})`}
          </span>
        </div>
        <div className={styles.adminControls}>
          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              checked={!p.inStock}
              disabled={busy}
              onChange={(e) => {
                e.stopPropagation();
                void onPatch(p.id, { inStock: !e.target.checked });
              }}
            />
            <span>نفد / غير متوفر (للعميل)</span>
          </label>
          <label className={styles.adminCheckboxRow}>
            <input
              type="checkbox"
              checked={!p.published}
              disabled={busy}
              onChange={(e) => {
                e.stopPropagation();
                void onPatch(p.id, { published: !e.target.checked });
              }}
            />
            <span>إخفاء من المتجر (يبقى هنا فقط)</span>
          </label>
        </div>
        <div className={styles.actions}>
          <Link className={`${styles.btn} ${styles.btnPrimary}`} to={editUrl}>
            <Pencil size={14} aria-hidden />
            تعديل
          </Link>
          {whatsappHref ? (
            <a className={styles.btn} href={whatsappHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={14} aria-hidden />
              واتساب
            </a>
          ) : null}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnDanger}`}
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              void onDelete(p.id);
            }}
          >
            <Trash2 size={14} aria-hidden />
            حذف
          </button>
        </div>
        <span className={styles.idTag}>#{p.id}</span>
      </div>
    </article>
  );
}
