"use client";

import type { TabCompletion } from "@/lib/admin/admin-product-tab-status";
import styles from "./AdminProductEditorTabs.module.css";

export type ProductEditorTab = "basic" | "pricing" | "images" | "filters" | "display" | "preview";

const TABS: { id: ProductEditorTab; label: string }[] = [
  { id: "basic", label: "المعلومات الأساسية" },
  { id: "pricing", label: "السعر والمخزون" },
  { id: "images", label: "الصور" },
  { id: "filters", label: "قيم الفلاتر" },
  { id: "display", label: "مواصفات العرض" },
  { id: "preview", label: "المعاينة والنشر" },
];

const STATUS_LABEL: Record<TabCompletion, string> = {
  complete: "مكتمل",
  warn: "ناقص",
  error: "خطأ",
  idle: "",
};

export function AdminProductEditorTabs({
  active,
  onChange,
  tabStatuses,
}: {
  active: ProductEditorTab;
  onChange: (tab: ProductEditorTab) => void;
  tabStatuses?: Partial<Record<ProductEditorTab, TabCompletion>>;
}) {
  return (
    <nav className={styles.tabs} aria-label="أقسام محرر المنتج">
      {TABS.map((tab) => {
        const st = tabStatuses?.[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
            onClick={() => onChange(tab.id)}
            aria-current={active === tab.id ? "page" : undefined}
          >
            <span>{tab.label}</span>
            {st && st !== "idle" ? (
              <span className={`${styles.tabBadge} ${styles[`tabBadge_${st}`]}`}>{STATUS_LABEL[st]}</span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}
