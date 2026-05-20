"use client";

import styles from "./AdminProductEditorTabs.module.css";

export type ProductEditorTab =
  | "basic"
  | "pricing"
  | "images"
  | "filters"
  | "display"
  | "variants"
  | "preview";

const TABS: { id: ProductEditorTab; label: string }[] = [
  { id: "basic", label: "Basic Info" },
  { id: "pricing", label: "Pricing & Stock" },
  { id: "images", label: "Images" },
  { id: "filters", label: "Filter Values" },
  { id: "display", label: "Display Specs" },
  { id: "variants", label: "Variants" },
  { id: "preview", label: "Preview" },
];

export function AdminProductEditorTabs({
  active,
  onChange,
}: {
  active: ProductEditorTab;
  onChange: (tab: ProductEditorTab) => void;
}) {
  return (
    <nav className={styles.tabs} aria-label="Product editor sections">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          className={`${styles.tab} ${active === tab.id ? styles.tabActive : ""}`}
          onClick={() => onChange(tab.id)}
          aria-current={active === tab.id ? "page" : undefined}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
