"use client";

import { useMemo } from "react";
import type { FacetAttributeDef } from "@/lib/data";
import { buildSmartSpecRows } from "@/lib/classification/filter-display-link";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import styles from "./AdminCategoryFilterPreview.module.css";

type Props = {
  attributes: FacetAttributeDef[];
  slug?: string;
  locale?: "ar" | "en";
};

export function AdminCategoryFilterPreview({ attributes, slug, locale = "ar" }: Props) {
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attributes);
  const rows = useMemo(() => buildSmartSpecRows(attributes, slug), [attributes, slug]);

  const linkedPairs = rows.filter((r) => r.displaySpecKey).length;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>معاينة نظام الفلاتر</h3>
      <div className={styles.stats}>
        <span>{filterableSpecs.length} فلتر في المتجر</span>
        <span>{extendedSpecs.length} مواصفة عرض إضافية</span>
        <span>{linkedPairs} ربط فلتر ↔ مواصفة منتج</span>
      </div>

      <div className={styles.columns}>
        <section>
          <h4>فلاتر صفحة القسم (عامة)</h4>
          <ul className={styles.list}>
            {filterableSpecs.map((a) => (
              <li key={a.key}>
                <strong>{locale === "ar" ? a.name_ar : a.name_en}</strong>
                <span className={styles.meta}>
                  {a.type ?? "SELECT"}
                  {a.options?.length ? ` · ${a.options.length} خيار` : ""}
                </span>
              </li>
            ))}
            {!filterableSpecs.length ? <li className={styles.empty}>لا فلاتر بعد</li> : null}
          </ul>
        </section>

        <section>
          <h4>محرر المنتج (صف واحد)</h4>
          <ul className={styles.list}>
            {rows.map((r) => (
              <li key={r.id}>
                <strong>{locale === "ar" ? r.titleAr : r.titleEn}</strong>
                <span className={styles.meta}>
                  {r.filterAttrs.map((f) => f.key).join(" + ")}
                  {r.displaySpecKey ? ` → ${r.displaySpecKey}` : ""}
                </span>
              </li>
            ))}
            {!rows.length ? <li className={styles.empty}>—</li> : null}
          </ul>
        </section>

        <section>
          <h4>صفحة المنتج (عرض موسع)</h4>
          <ul className={styles.list}>
            {rows
              .filter((r) => r.displaySpecKey)
              .map((r) => (
                <li key={r.id}>
                  <strong>{r.displaySpecKey}</strong>
                  <span className={styles.meta}>{locale === "ar" ? r.titleAr : r.titleEn}</span>
                </li>
              ))}
            {extendedSpecs
              .filter((a) => !rows.some((r) => r.displaySpecKey === a.key))
              .map((a) => (
                <li key={a.key}>
                  <strong>{a.key}</strong>
                  <span className={styles.meta}>{locale === "ar" ? a.name_ar : a.name_en}</span>
                </li>
              ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
