"use client";

import { useState } from "react";
import styles from "./AdminProductEditorTabs.module.css";

export type EditorMode = "simple" | "advanced";

export function AdminEditorModeToggle({
  mode,
  onChange,
}: {
  mode: EditorMode;
  onChange: (mode: EditorMode) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  if (mode === "advanced") {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--admin-muted)", alignSelf: "center" }}>
          الوضع المتقدم: مفاتيح تقنية، فلاتر ومواصفات منفصلة، SEO
        </span>
        <button
          type="button"
          className={styles.modeToggle}
          onClick={() => {
            onChange("simple");
            setExpanded(false);
          }}
        >
          العودة للوضع البسيط
        </button>
      </div>
    );
  }

  if (!expanded) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" className={styles.modeToggle} onClick={() => setExpanded(true)}>
          الوضع المتقدم (اختياري)
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 8,
        marginBottom: 8,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, color: "var(--admin-muted)", maxWidth: 420 }}>
        للموظف اليومي يكفي «المواصفات والفلاتر». المتقدم يفصل قيم الفلاتر عن مواصفات العرض ويعرض المفاتيح التقنية.
      </p>
      <button type="button" className={styles.modeToggle} onClick={() => setExpanded(false)}>
        إلغاء
      </button>
      <button
        type="button"
        className={styles.modeToggle}
        onClick={() => {
          onChange("advanced");
          setExpanded(false);
        }}
      >
        فتح الوضع المتقدم
      </button>
    </div>
  );
}
