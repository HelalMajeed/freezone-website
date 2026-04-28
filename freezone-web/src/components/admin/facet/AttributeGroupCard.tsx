"use client";

import { useEffect, useRef } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FacetUiGroup } from "@/lib/facet-admin-labels";
import { FACET_ADMIN_LABEL_AR, FACET_ADMIN_LABEL_EN } from "@/lib/facet-admin-labels";
import { defaultFacetNamesForKey } from "@/lib/facet-attributes";
import type { FacetAttributeDef } from "@/lib/data";
import { AttributeChip } from "./AttributeChip";
import type { FacetIconName } from "./facet-key-icon";
import styles from "./attribute-group-card.module.css";

type Props = {
  group: FacetUiGroup;
  keysInGroup: string[];
  value: FacetAttributeDef[];
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (next: FacetAttributeDef[]) => void;
  iconOverrides: Record<string, FacetIconName>;
  onEditIcon: (key: string) => void;
};

function chipLabel(key: string): string {
  const ar = FACET_ADMIN_LABEL_AR[key] ?? key;
  const en = FACET_ADMIN_LABEL_EN[key] ?? key;
  if (ar === en) return ar;
  return `${ar} / ${en}`;
}

export function AttributeGroupCard({ group, keysInGroup, value, expanded, onToggleExpand, onChange, iconOverrides, onEditIcon }: Props) {
  const selectedKeys = new Set(value.map((a) => a.key));
  const selectedCount = keysInGroup.filter((k) => selectedKeys.has(k)).length;
  const total = keysInGroup.length;
  const groupAllSelected = total > 0 && selectedCount === total;
  const groupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = groupInputRef.current;
    if (!el) return;
    el.indeterminate = selectedCount > 0 && selectedCount < total;
  }, [selectedCount, total]);

  const toggleKey = (k: string) => {
    if (selectedKeys.has(k)) {
      onChange(value.filter((a) => a.key !== k));
    } else {
      const d = defaultFacetNamesForKey(k);
      onChange([...value, { key: k, name_en: d.name_en, name_ar: d.name_ar }]);
    }
  };

  const selectAll = () => {
    const map = new Map(value.map((a) => [a.key, a]));
    for (const k of keysInGroup) {
      if (!map.has(k)) {
        const d = defaultFacetNamesForKey(k);
        map.set(k, { key: k, name_en: d.name_en, name_ar: d.name_ar });
      }
    }
    onChange([...map.values()]);
  };

  const clearGroup = () => {
    const remove = new Set(keysInGroup);
    onChange(value.filter((a) => !remove.has(a.key)));
  };

  const onGroupCheckboxChange = () => {
    if (groupAllSelected) clearGroup();
    else selectAll();
  };

  return (
    <section className={styles.card} aria-labelledby={`facet-group-${group.id}`}>
      <header className={styles.head}>
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={onToggleExpand}
          aria-expanded={expanded}
          aria-label={expanded ? "طي" : "توسيع"}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className={styles.titleBlock}>
          <h3 id={`facet-group-${group.id}`} className={styles.titleAr}>
            {group.titleAr}
          </h3>
          <p className={styles.titleEn}>{group.titleEn}</p>
          <span className={`${styles.badge} ${selectedCount > 0 ? styles.badgeStrong : ""}`}>
            مختار {selectedCount} / {total}
          </span>
        </div>
        <label className={styles.groupSelect}>
          <input
            ref={groupInputRef}
            type="checkbox"
            className={styles.groupCheckbox}
            checked={groupAllSelected}
            onChange={onGroupCheckboxChange}
            disabled={total === 0}
          />
          <span className={styles.groupSelectLabel}>تحديد المجموعة</span>
        </label>
      </header>
      {expanded && (
        <div className={styles.body}>
          <div className={styles.chips}>
            {keysInGroup.length === 0 ? (
              <p className={styles.emptyHint}>لا توجد حقول في هذه المجموعة ضمن البحث الحالي.</p>
            ) : (
              keysInGroup.map((k) => (
                <AttributeChip
                  key={k}
                  facetKey={k}
                  labelAr={chipLabel(k)}
                  selected={selectedKeys.has(k)}
                  onToggle={() => toggleKey(k)}
                  iconName={iconOverrides[k]}
                  onEditIcon={() => onEditIcon(k)}
                />
              ))
            )}
          </div>
        </div>
      )}
    </section>
  );
}
