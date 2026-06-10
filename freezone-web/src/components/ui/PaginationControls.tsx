"use client";

import { useTranslations } from "@/i18n/hooks";
import styles from "./PaginationControls.module.css";

/**
 * Numbered pagination for product listings (bilingual, RTL-aware — order
 * follows the document direction). Windows long ranges as
 * `1 … p-1 p p+1 … last`.
 */
export function PaginationControls({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("listing");
  if (pageCount <= 1) return null;

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), pageCount);
    if (next !== page) onPageChange(next);
  };

  return (
    <nav className={styles.pagination} aria-label={t("pagination")}>
      <button
        type="button"
        className={styles.navBtn}
        onClick={() => go(page - 1)}
        disabled={page <= 1}
      >
        {t("prevPage")}
      </button>
      <ul className={styles.pageList}>
        {pageItems(page, pageCount).map((item, i) =>
          item === "gap" ? (
            <li key={`gap-${i}`} className={styles.gap} aria-hidden>
              …
            </li>
          ) : (
            <li key={item}>
              <button
                type="button"
                className={item === page ? `${styles.pageBtn} ${styles.pageBtnActive}` : styles.pageBtn}
                aria-label={item === page ? t("currentPageAria", { page: String(item) }) : t("pageAria", { page: String(item) })}
                aria-current={item === page ? "page" : undefined}
                onClick={() => go(item)}
              >
                {item}
              </button>
            </li>
          ),
        )}
      </ul>
      <button
        type="button"
        className={styles.navBtn}
        onClick={() => go(page + 1)}
        disabled={page >= pageCount}
      >
        {t("nextPage")}
      </button>
      <span className={styles.status} aria-hidden>
        {t("pageStatus", { page: String(page), total: String(pageCount) })}
      </span>
    </nav>
  );
}

/** First + last always visible; current ±1 in between; "gap" marks ellipses. */
function pageItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p++) items.push(p);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);
  return items;
}
