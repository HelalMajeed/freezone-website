"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import type { CategoryCardData } from "./CategoryCard";
import styles from "./admin-categories.module.css";

type Props = {
  open: boolean;
  rtl: boolean;
  cat: CategoryCardData | null;
  primaryProductCount: number;
  secondaryLinkCount: number;
  pending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteCategoryModal({
  open,
  rtl,
  cat,
  primaryProductCount,
  secondaryLinkCount,
  pending,
  onClose,
  onConfirm,
}: Props) {
  if (!cat) return null;

  const label = cat.nameAr?.trim() || cat.nameEn?.trim() || cat.slug;
  const blocked = primaryProductCount > 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="delete-backdrop"
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            key="delete-panel"
            className={`${styles.panel} ${styles.confirmPanel}`}
            dir={rtl ? "rtl" : "ltr"}
            initial={{ scale: 0.96, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 28, stiffness: 380 }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-category-title"
          >
            <div className={styles.panelHead}>
              <div className={styles.confirmHeadIcon} aria-hidden>
                <AlertTriangle size={22} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 id="delete-category-title" className={styles.panelTitle}>
                  حذف القسم
                </h2>
                <p className={styles.confirmSubtitle} dir="ltr">
                  {cat.slug}
                </p>
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
                ×
              </button>
            </div>

            <div className={styles.panelBody}>
              <p className={styles.confirmLead}>
                هل تريد حذف القسم <strong>«{label}»</strong> نهائياً؟
              </p>

              <ul className={styles.confirmList}>
                {secondaryLinkCount > 0 ? (
                  <li>
                    سيتم إزالة <strong>{secondaryLinkCount}</strong> ربط ثانوي للمنتجات بهذا القسم.
                  </li>
                ) : (
                  <li>لا توجد منتجات مرتبطة ثانوياً بهذا القسم.</li>
                )}
                {primaryProductCount > 0 ? (
                  <li>
                    يوجد <strong>{primaryProductCount}</strong> منتج يستخدم هذا القسم كقسم رئيسي — يجب نقلهم
                    أولاً.
                  </li>
                ) : (
                  <li>لا توجد منتجات تستخدم هذا القسم كقسم رئيسي.</li>
                )}
              </ul>

              {blocked ? (
                <div className={styles.confirmWarn} role="alert">
                  <p style={{ margin: 0 }}>
                    لا يمكن الحذف حتى تنقل المنتجات إلى قسم آخر من صفحة المنتجات.
                  </p>
                  <Link
                    to={`/admin/products?cat=${encodeURIComponent(cat.slug)}`}
                    className={styles.confirmLink}
                    onClick={onClose}
                  >
                    فتح المنتجات المرتبطة →
                  </Link>
                </div>
              ) : null}
            </div>

            <div className={styles.panelFoot}>
              <button type="button" className={styles.btnGhost} onClick={onClose} disabled={pending}>
                إلغاء
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={pending || blocked}
                onClick={onConfirm}
              >
                <Trash2 size={16} aria-hidden />
                {pending ? "جاري الحذف…" : "نعم، احذف القسم"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
