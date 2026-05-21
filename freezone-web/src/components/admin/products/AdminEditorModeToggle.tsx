"use client";

import styles from "./AdminProductEditorTabs.module.css";

export type EditorMode = "simple" | "advanced";

export function AdminEditorModeToggle({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
      <button
        type="button"
        className={styles.modeToggle}
        onClick={() => onChange(mode === "simple" ? "advanced" : "simple")}
      >
        {mode === "simple" ? "الوضع المتقدم" : "الوضع البسيط"}
      </button>
    </div>
  );
}
