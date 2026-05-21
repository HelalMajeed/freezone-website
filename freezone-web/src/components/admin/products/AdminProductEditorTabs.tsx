"use client";

import type { TabCompletion } from "@/lib/admin/admin-product-tab-status";
import styles from "./AdminProductEditorTabs.module.css";

export type ProductEditorTab = "basic" | "pricing" | "images" | "filters" | "display" | "preview";

export type ProductEditorSimpleTab = "info" | "commerce" | "smartSpecs" | "review";

const ADVANCED_TABS: { id: ProductEditorTab; label: string }[] = [
  { id: "basic", label: "المعلومات الأساسية" },
  { id: "pricing", label: "السعر والمخزون" },
  { id: "images", label: "الصور" },
  { id: "filters", label: "قيم الفلاتر" },
  { id: "display", label: "مواصفات العرض" },
  { id: "preview", label: "المعاينة والنشر" },
];

const SIMPLE_TABS: { id: ProductEditorSimpleTab; label: string }[] = [
  { id: "info", label: "بيانات المنتج" },
  { id: "commerce", label: "السعر والصور" },
  { id: "smartSpecs", label: "المواصفات الذكية" },
  { id: "review", label: "المراجعة والنشر" },
];

const STATUS_LABEL: Record<TabCompletion, string> = {
  complete: "مكتمل",
  warn: "ناقص",
  error: "خطأ",
  idle: "",
};

export function AdminProductEditorTabs({
  mode = "advanced",
  active,
  onChange,
  activeSimple,
  onChangeSimple,
  tabStatuses,
  simpleTabStatuses,
}: {
  mode?: "simple" | "advanced";
  active?: ProductEditorTab;
  onChange?: (tab: ProductEditorTab) => void;
  activeSimple?: ProductEditorSimpleTab;
  onChangeSimple?: (tab: ProductEditorSimpleTab) => void;
  tabStatuses?: Partial<Record<ProductEditorTab, TabCompletion>>;
  simpleTabStatuses?: Partial<Record<ProductEditorSimpleTab, TabCompletion>>;
}) {
  if (mode === "simple") {
    const tab = activeSimple ?? "info";
    return (
      <nav className={styles.tabs} aria-label="خطوات إضافة المنتج">
        {SIMPLE_TABS.map((t) => {
          const st = simpleTabStatuses?.[t.id];
          return (
            <button
              key={t.id}
              type="button"
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
              onClick={() => onChangeSimple?.(t.id)}
              aria-current={tab === t.id ? "page" : undefined}
            >
              <span>{t.label}</span>
              {st && st !== "idle" ? (
                <span className={`${styles.tabBadge} ${styles[`tabBadge_${st}`]}`}>{STATUS_LABEL[st]}</span>
              ) : null}
            </button>
          );
        })}
      </nav>
    );
  }

  const tab = active ?? "basic";
  return (
    <nav className={styles.tabs} aria-label="أقسام محرر المنتج">
      {ADVANCED_TABS.map((t) => {
        const st = tabStatuses?.[t.id];
        return (
          <button
            key={t.id}
            type="button"
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
            onClick={() => onChange?.(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
          >
            <span>{t.label}</span>
            {st && st !== "idle" ? (
              <span className={`${styles.tabBadge} ${styles[`tabBadge_${st}`]}`}>{STATUS_LABEL[st]}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
