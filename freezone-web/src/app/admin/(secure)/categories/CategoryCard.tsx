"use client";

import { GripVertical } from "lucide-react";
import clsx from "clsx";
import styles from "./admin-categories.module.css";
import { facetAttributesToOrderedSelection } from "@/components/admin/facet/facet-keys-utils";
import type { FacetAttributeDef } from "@/lib/data";

export type CategoryCardData = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  color: string;
  sortOrder: number;
};

type Props = {
  cat: CategoryCardData;
  facetAttributes: FacetAttributeDef[];
  catalogFieldTotal: number;
  onOpen: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
  isDragging?: boolean;
};

export function CategoryCard({
  cat,
  facetAttributes,
  catalogFieldTotal,
  onOpen,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
}: Props) {
  const n = facetAttributes.length;
  const ratioLabel = `${n} / ${catalogFieldTotal}`;
  const warn = n < Math.min(4, catalogFieldTotal) && n > 0;
  const ordered = facetAttributesToOrderedSelection(facetAttributes).slice(0, 4);

  return (
    <div
      role="button"
      tabIndex={0}
      data-category-id={cat.id}
      className={clsx(styles.card, isDragging && styles.cardDragging)}
      style={{ ["--cardTint" as string]: `${cat.color}22` }}
      onClick={onOpen}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className={styles.cardMenu}>
        <button
          type="button"
          className={styles.iconBtn}
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onClick={(e) => e.stopPropagation()}
          aria-label="سحب لإعادة الترتيب"
        >
          <GripVertical size={16} />
        </button>
      </div>
      <div className={styles.cardIcon}>{cat.icon?.trim() || "📁"}</div>
      <div className={styles.cardNameAr}>{cat.nameAr || cat.nameEn}</div>
      <div className={styles.cardNameEn}>{cat.nameEn}</div>
      <div className={styles.cardSlug} dir="ltr">
        {cat.slug}
      </div>
      {ordered.length > 0 ? (
        <div className={styles.chipRow}>
          {ordered.map((a) => (
            <span key={a.key} className={styles.chip} title={a.key}>
              {a.name_ar} / {a.name_en}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.cardSlug}>لا حقول فلاتر بعد</div>
      )}
      <span className={clsx(styles.cardBadge, warn && styles.cardBadgeWarn)}>{ratioLabel} حقول</span>
    </div>
  );
}
