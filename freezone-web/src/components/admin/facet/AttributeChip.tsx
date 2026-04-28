"use client";

import { Check, Pencil } from "lucide-react";
import type { FacetIconName } from "./facet-key-icon";
import { pickFacetIcon } from "./facet-key-icon";
import styles from "./attribute-chip.module.css";

type Props = {
  facetKey: string;
  labelAr: string;
  selected: boolean;
  onToggle: () => void;
  iconName?: FacetIconName | null;
  onEditIcon?: () => void;
};

export function AttributeChip({ facetKey, labelAr, selected, onToggle, iconName, onEditIcon }: Props) {
  const Icon = pickFacetIcon(facetKey, iconName);
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.tile} ${selected ? styles.tileSelected : ""}`}
      onClick={onToggle}
      aria-pressed={selected}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <span className={styles.checkSlot} aria-hidden>
        {selected ? (
          <span className={styles.checkOn}>
            <Check size={12} strokeWidth={3} />
          </span>
        ) : (
          <span className={styles.checkOff} />
        )}
      </span>
      {onEditIcon ? (
        <button
          type="button"
          className={styles.editBtn}
          onClick={(e) => {
            e.stopPropagation();
            onEditIcon();
          }}
          aria-label={`تعديل أيقونة ${labelAr}`}
          title="تعديل الأيقونة"
        >
          <Pencil size={12} />
        </button>
      ) : null}
      <span className={styles.iconWrap} aria-hidden>
        <Icon size={22} strokeWidth={1.75} />
      </span>
      <span className={styles.label}>{labelAr}</span>
      <span className={styles.key} dir="ltr">
        {facetKey}
      </span>
    </div>
  );
}
