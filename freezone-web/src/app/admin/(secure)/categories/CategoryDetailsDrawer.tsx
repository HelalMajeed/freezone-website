"use client";

import { useCallback, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { FacetKeysPicker, type FacetImportCategoryOption, type FacetKeysEditorHandle } from "@/components/admin/FacetKeysPicker";
import styles from "./admin-categories.module.css";
import type { CategoryCardData } from "./CategoryCard";
import type { FacetAttributeDef } from "@/lib/data";

export type DrawerCategory = CategoryCardData & {
  backgroundImageUrl: string | null;
};

type Props = {
  open: boolean;
  rtl: boolean;
  cat: DrawerCategory | null;
  facetAttributes: FacetAttributeDef[];
  baselineFacetAttributes: FacetAttributeDef[];
  onClose: () => void;
  onChangeCat: (patch: Partial<DrawerCategory>) => void;
  onFacetAttributesChange: (next: FacetAttributeDef[]) => void;
  onSave: () => void | Promise<void>;
  savePending: boolean;
  deletePending?: boolean;
  onDelete?: () => void;
  importCategoryOptions?: FacetImportCategoryOption[];
};

/** Centered edit modal: category fields + full attribute editor (no slide-in drawer). */
export function CategoryDetailsDrawer({
  open,
  rtl,
  cat,
  facetAttributes,
  baselineFacetAttributes,
  onClose,
  onChangeCat,
  onFacetAttributesChange,
  onSave,
  savePending,
  deletePending = false,
  onDelete,
  importCategoryOptions,
}: Props) {
  const facetEditorRef = useRef<FacetKeysEditorHandle>(null);

  const saveWithFlush = useCallback(async () => {
    if (facetEditorRef.current?.flushPendingCustomBeforeSave() === false) return;
    await onSave();
  }, [onSave]);

  return (
    <AnimatePresence>
      {open && cat ? (
        <motion.div
          key="backdrop"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key="panel"
            className={styles.panel}
            dir={rtl ? "rtl" : "ltr"}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>تعديل القسم</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--admin-muted)" }} dir="ltr">
                  #{cat.id} · {cat.slug}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
                ×
              </button>
            </div>
            <div className={styles.panelBody}>
              <div>
                <div className={styles.label}>الاسم عربي</div>
                <input
                  className={styles.input}
                  value={cat.nameAr}
                  onChange={(e) => onChangeCat({ nameAr: e.target.value })}
                  placeholder="الاسم عربي"
                />
              </div>
              <div>
                <div className={styles.label}>Name EN</div>
                <input
                  className={styles.input}
                  value={cat.nameEn}
                  onChange={(e) => onChangeCat({ nameEn: e.target.value })}
                  placeholder="Name EN"
                />
              </div>
              <div className={styles.fieldRow}>
                <div>
                  <div className={styles.label}>لون البطاقة</div>
                  <input
                    type="color"
                    value={cat.color}
                    onChange={(e) => onChangeCat({ color: e.target.value })}
                    style={{ width: "100%", height: 40, border: "none", background: "transparent" }}
                  />
                </div>
                <div>
                  <div className={styles.label}>ترتيب العرض</div>
                  <input
                    type="number"
                    className={styles.input}
                    value={cat.sortOrder}
                    onChange={(e) => onChangeCat({ sortOrder: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <div className={styles.label}>صورة الخلفية (رابط)</div>
                <input
                  dir="ltr"
                  type="url"
                  className={styles.input}
                  placeholder="https://…"
                  value={cat.backgroundImageUrl ?? ""}
                  onChange={(e) => onChangeCat({ backgroundImageUrl: e.target.value || null })}
                />
              </div>
              {(cat.backgroundImageUrl ?? "").trim() ? (
                <img
                  src={(cat.backgroundImageUrl ?? "").trim()}
                  alt=""
                  style={{ maxWidth: "100%", maxHeight: 120, borderRadius: 8, objectFit: "cover" }}
                />
              ) : null}

              <div className={styles.facetBlock}>
                <FacetKeysPicker
                  ref={facetEditorRef}
                  value={facetAttributes}
                  onChange={onFacetAttributesChange}
                  baselineKeys={baselineFacetAttributes}
                  onSave={() => void saveWithFlush()}
                  savePending={savePending}
                  singleScroll
                  manualOnly
                  importCategoryOptions={importCategoryOptions}
                  excludeImportCategoryId={cat?.id}
                />
              </div>
            </div>
            <div className={styles.panelFoot}>
              {onDelete ? (
                <button
                  type="button"
                  className={`${styles.btnDanger} ${styles.panelFootDanger}`}
                  disabled={deletePending || savePending}
                  onClick={onDelete}
                >
                  <Trash2 size={16} aria-hidden />
                  {deletePending ? "جاري الحذف…" : "حذف القسم"}
                </button>
              ) : null}
              <button type="button" className={styles.btnGhost} onClick={onClose}>
                إغلاق
              </button>
              <button
                type="button"
                className={styles.btnPrimary}
                disabled={savePending || deletePending}
                onClick={() => void saveWithFlush()}
              >
                {savePending ? "…" : "حفظ القسم"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
