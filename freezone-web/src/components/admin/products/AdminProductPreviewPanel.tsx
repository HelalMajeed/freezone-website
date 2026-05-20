"use client";

import type { FacetAttributeDef } from "@/lib/data";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import styles from "./AdminProductPreviewPanel.module.css";

const PREVIEW_FILTER_KEYS = [
  "processor_family",
  "gpu_model",
  "graphics_card",
  "ram_size",
  "storage_size",
  "screen_size",
  "display_resolution",
];

const PREVIEW_DISPLAY_KEYS = [
  "processor_full",
  "cpu",
  "gpu_full",
  "gpu",
  "ram_display",
  "ram",
  "storage_display",
  "storage",
  "display_full",
  "screen",
];

export function AdminProductPreviewPanel({
  displaySpecs,
  filterSpecs,
  attributes,
  locale = "ar",
}: {
  displaySpecs: Record<string, string>;
  filterSpecs: Record<string, string>;
  attributes: FacetAttributeDef[];
  locale?: "en" | "ar";
}) {
  const { filterableSpecs } = partitionFacetAttributes(attributes);
  const attrByKey = new Map(attributes.map((a) => [a.key, a]));

  const filterRows = PREVIEW_FILTER_KEYS.map((key) => {
    const v = (filterSpecs[key] ?? "").trim();
    if (!v) return null;
    const attr = attrByKey.get(key);
    return {
      key,
      label: attr ? facetAttributeDisplayName(attr, locale) : key,
      value: v,
    };
  }).filter(Boolean) as { key: string; label: string; value: string }[];

  for (const attr of filterableSpecs) {
    if (PREVIEW_FILTER_KEYS.includes(attr.key)) continue;
    const v = (filterSpecs[attr.key] ?? "").trim();
    if (v) filterRows.push({ key: attr.key, label: facetAttributeDisplayName(attr, locale), value: v });
  }

  const displayRows = PREVIEW_DISPLAY_KEYS.map((key) => {
    const v = (displaySpecs[key] ?? "").trim();
    if (!v) return null;
    const attr = attrByKey.get(key);
    return {
      key,
      label: attr ? facetAttributeDisplayName(attr, locale) : key,
      value: v.length > 120 ? `${v.slice(0, 120)}…` : v,
    };
  }).filter(Boolean) as { key: string; label: string; value: string }[];

  return (
    <div className={styles.grid}>
      <section className={styles.card}>
        <h3 className={styles.title}>Product Page Preview (Display Specs)</h3>
        <p className={styles.hint}>النص الكامل يظهر في صفحة المنتج فقط.</p>
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
        <h3 className={styles.title}>Filter Preview (Sidebar)</h3>
        <p className={styles.hint}>قيم مختصرة — Core i7، RTX 5070، 16، 1024.</p>
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
    </div>
  );
}
