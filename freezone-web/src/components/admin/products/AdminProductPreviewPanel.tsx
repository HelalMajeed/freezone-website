"use client";

import type { FacetAttributeDef } from "@/lib/data";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import styles from "./AdminProductPreviewPanel.module.css";
import ui from "@/components/admin/ui/AdminUi.module.css";

export type PublishCheckItem = { id: string; label: string; ok: boolean };

export function AdminProductPreviewPanel({
  displaySpecs,
  filterSpecs,
  attributes,
  locale = "ar",
  productName,
  priceLabel,
  imageUrl,
  checklist,
  onPublish,
  onSaveDraft,
  publishing,
}: {
  displaySpecs: Record<string, string>;
  filterSpecs: Record<string, string>;
  attributes: FacetAttributeDef[];
  locale?: "en" | "ar";
  productName?: string;
  priceLabel?: string;
  imageUrl?: string | null;
  checklist?: PublishCheckItem[];
  onPublish?: () => void;
  onSaveDraft?: () => void;
  publishing?: boolean;
}) {
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);

  const filterRows = filterableSpecs
    .map((attr) => {
      const v = (filterSpecs[attr.key] ?? "").trim();
      if (!v) return null;
      return { key: attr.key, label: facetAttributeDisplayName(attr, locale), value: v };
    })
    .filter(Boolean) as { key: string; label: string; value: string }[];

  const displayRows = extendedSpecs
    .map((attr) => {
      const v = (displaySpecs[attr.key] ?? "").trim();
      if (!v) return null;
      return {
        key: attr.key,
        label: facetAttributeDisplayName(attr, locale),
        value: v.length > 160 ? `${v.slice(0, 160)}…` : v,
      };
    })
    .filter(Boolean) as { key: string; label: string; value: string }[];

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h3 className={styles.title}>معاينة صفحة المنتج</h3>
        <p className={styles.hint}>المواصفات الكاملة تظهر في صفحة المنتج فقط.</p>
        {productName ? (
          <div className={styles.productHero}>
            {imageUrl ? <img src={imageUrl} alt="" className={styles.heroImg} /> : <span className={styles.heroPlaceholder}>بدون صورة</span>}
            <div>
              <strong>{productName}</strong>
              {priceLabel ? <div className={styles.price}>{priceLabel}</div> : null}
            </div>
          </div>
        ) : null}
        {displayRows.length === 0 ? (
          <p className={styles.empty}>لا توجد مواصفات عرض بعد.</p>
        ) : (
          <dl className={styles.list}>
            {displayRows.map((r) => (
              <div key={r.key} className={styles.row}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <section className={styles.card}>
        <h3 className={styles.title}>معاينة فلاتر الكتالوج</h3>
        <p className={styles.hint}>قيم مختصرة — تظهر في شريط فلاتر صفحة القسم.</p>
        {filterRows.length === 0 ? (
          <p className={styles.empty}>لا توجد قيم فلتر بعد.</p>
        ) : (
          <dl className={styles.list}>
            {filterRows.map((r) => (
              <div key={r.key} className={styles.row}>
                <dt>{r.label}</dt>
                <dd>{r.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      {checklist?.length ? (
        <section className={`${styles.card} ${styles.cardWide}`}>
          <h3 className={styles.title}>قائمة النشر</h3>
          <ul className={ui.checklist}>
            {checklist.map((c) => (
              <li key={c.id} className={c.ok ? ui.checkOk : ui.checkFail}>
                {c.ok ? "✓" : "○"} {c.label}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {onSaveDraft ? (
              <button type="button" className={ui.btnSm} onClick={onSaveDraft} disabled={publishing}>
                حفظ كمسودة
              </button>
            ) : null}
            {onPublish ? (
              <button type="button" className={`${ui.btnSm} ${ui.btnPrimaryOutline}`} onClick={onPublish} disabled={publishing}>
                نشر المنتج
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
      <section className={`${styles.card} ${styles.cardWide}`}>
        <h3 className={styles.title}>كيف يؤثر الإدارة على المتجر</h3>
        <ul className={ui.impactList}>
          <li>
            <strong>المعلومات والسعر والمخزون</strong> — تظهر في بطاقة المنتج وصفحة التفاصيل.
          </li>
          <li>
            <strong>قيم الفلاتر</strong> — تظهر في فلاتر صفحة القسم فقط.
          </li>
          <li>
            <strong>مواصفات العرض</strong> — تظهر داخل صفحة المنتج فقط.
          </li>
        </ul>
      </section>
    </div>
  );
}
