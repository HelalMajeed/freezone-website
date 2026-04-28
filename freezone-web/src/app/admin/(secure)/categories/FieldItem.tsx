"use client";

/**
 * Presentational row for a catalog facet (Arabic label + technical key).
 * Used here for consistency with the SaaS spec; the live editor remains `FacetKeysPicker`
 * (tiles + toolbar + preview). This component is available for future extensions.
 */
import { ChevronDown, ChevronUp, X } from "lucide-react";
import styles from "./admin-categories.module.css";

export type FieldItemProps = {
  nameAr: string;
  specKey: string;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  disableUp?: boolean;
  disableDown?: boolean;
  showReorder?: boolean;
};

export function FieldItem({
  nameAr,
  specKey,
  onRemove,
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
  showReorder = true,
}: FieldItemProps) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 8,
        background: "var(--admin-surface-muted)",
        border: "1px solid var(--admin-border)",
      }}
    >
      {showReorder ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button
            type="button"
            className={styles.iconBtn}
            style={{ width: 26, height: 22, cursor: disableUp ? "not-allowed" : "pointer", opacity: disableUp ? 0.35 : 1 }}
            onClick={onMoveUp}
            disabled={disableUp}
            aria-label="أعلى"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            className={styles.iconBtn}
            style={{ width: 26, height: 22, cursor: disableDown ? "not-allowed" : "pointer", opacity: disableDown ? 0.35 : 1 }}
            onClick={onMoveDown}
            disabled={disableDown}
            aria-label="أسفل"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--admin-text)" }}>{nameAr}</div>
        <div style={{ fontSize: 11, color: "var(--admin-muted)", fontFamily: "ui-monospace, monospace" }} dir="ltr">
          {specKey}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`إزالة ${specKey}`}
        style={{
          border: "none",
          background: "transparent",
          color: "var(--admin-muted)",
          cursor: "pointer",
          padding: 6,
          borderRadius: 6,
        }}
      >
        <X size={18} />
      </button>
    </div>
  );
}
