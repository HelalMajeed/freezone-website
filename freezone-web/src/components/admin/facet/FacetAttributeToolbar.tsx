"use client";

import { useEffect, useRef } from "react";
import { Search } from "lucide-react";
import styles from "./facet-attribute-toolbar.module.css";

type Props = {
  globalSearch: string;
  onGlobalSearch: (q: string) => void;
  allVisibleSelected: boolean;
  someVisibleSelected: boolean;
  visibleCount: number;
  selectedCount: number;
  onToggleSelectAllVisible: () => void;
  onClearAll: () => void;
  onReset?: () => void;
  resetDisabled?: boolean;
  onPreview: () => void;
  onSave?: () => void | Promise<void>;
  savePending?: boolean;
  saveDisabled?: boolean;
};

export function FacetAttributeToolbar({
  globalSearch,
  onGlobalSearch,
  allVisibleSelected,
  someVisibleSelected,
  visibleCount,
  selectedCount,
  onToggleSelectAllVisible,
  onClearAll,
  onReset,
  resetDisabled,
  onPreview,
  onSave,
  savePending,
  saveDisabled,
}: Props) {
  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    el.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  return (
    <div className={styles.bar}>
      <div className={styles.searchWrap}>
        <Search className={styles.searchIcon} size={18} strokeWidth={2} aria-hidden />
        <input
          className={styles.search}
          dir="ltr"
          placeholder="بحث في الحقول (cpu، شاشة، UPS…)…"
          value={globalSearch}
          onChange={(e) => onGlobalSearch(e.target.value)}
          aria-label="بحث شامل في الحقول"
        />
      </div>

      <div className={styles.actions}>
        {onSave ? (
          <button type="button" className={styles.btnPrimary} disabled={saveDisabled || savePending} onClick={() => void onSave()}>
            {savePending ? "…" : "حفظ"}
          </button>
        ) : null}
        <button type="button" className={styles.linkDanger} onClick={onClearAll}>
          مسح الكل
        </button>
        {onReset ? (
          <button type="button" className={styles.linkMuted} onClick={onReset} disabled={resetDisabled}>
            إعادة ضبط
          </button>
        ) : null}
        <label className={styles.selectAllLabel}>
          <input
            ref={selectAllRef}
            type="checkbox"
            className={styles.checkbox}
            checked={allVisibleSelected && visibleCount > 0}
            onChange={onToggleSelectAllVisible}
            disabled={visibleCount === 0}
          />
          <span>تحديد الكل المعروض</span>
        </label>
        <button type="button" className={styles.btnGhost} onClick={onPreview}>
          معاينة
        </button>
        <span className={styles.metaText}>
          {selectedCount} مختار
          {visibleCount > 0 ? ` · ${visibleCount} معروض` : ""}
        </span>
      </div>
    </div>
  );
}
