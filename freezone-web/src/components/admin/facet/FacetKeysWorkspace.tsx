"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { Link } from "react-router-dom";
import { Copy, Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { FacetAttributeDef } from "@/lib/data";
import { FACET_ADMIN_LABEL_AR, FACET_ADMIN_LABEL_EN, FACET_UI_GROUPS } from "@/lib/facet-admin-labels";
import {
  defaultFacetNamesForKey,
  facetAttributeDisplayName,
  makeCustomFacetAttribute,
  validateFacetAttributesForSave,
} from "@/lib/facet-attributes";
import { AttributeGroupCard } from "./AttributeGroupCard";
import { FacetAttributeToolbar } from "./FacetAttributeToolbar";
import { facetAttributesToOrderedSelection, getFacetCatalogOrder } from "./facet-keys-utils";
import { FACET_ICON_OPTIONS, iconFromName, isFacetIconName, type FacetIconName } from "./facet-key-icon";
import styles from "./facet-keys-workspace.module.css";

const CATALOG_ORDER = getFacetCatalogOrder();

function matchesSearch(key: string, q: string): boolean {
  if (!q.trim()) return true;
  const n = q.trim().toLowerCase();
  const ar = (FACET_ADMIN_LABEL_AR[key] ?? "").toLowerCase();
  const en = (FACET_ADMIN_LABEL_EN[key] ?? "").toLowerCase();
  return key.toLowerCase().includes(n) || ar.includes(n) || en.includes(n);
}

function attrsSignature(attrs: FacetAttributeDef[]): string {
  return [...attrs]
    .map((a) => `${a.key}\t${a.name_en}\t${a.name_ar}`)
    .sort()
    .join("\n");
}

/** Categories whose saved `facetKeys` can be copied into the editor (e.g. admin categories list). */
export type FacetImportCategoryOption = {
  id: number;
  nameAr: string;
  nameEn: string;
  slug: string;
  facetAttributes: FacetAttributeDef[];
};

export type FacetKeysWorkspaceProps = {
  value: FacetAttributeDef[];
  onChange: (next: FacetAttributeDef[]) => void;
  baselineKeys?: FacetAttributeDef[];
  context?: {
    nameAr?: string;
    nameEn?: string;
    slug?: string;
  };
  onSave?: () => void | Promise<void>;
  savePending?: boolean;
  saveDisabled?: boolean;
  compact?: boolean;
  singleScroll?: boolean;
  manualOnly?: boolean;
  /** When set with `manualOnly`, show “copy from another category” (excludes `excludeImportCategoryId` if set). */
  importCategoryOptions?: FacetImportCategoryOption[];
  excludeImportCategoryId?: number;
};

/** Ref handle for parent save (e.g. category modal) to merge typed-but-not-clicked custom attributes before PATCH. */
export type FacetKeysEditorHandle = {
  flushPendingCustomBeforeSave: () => boolean;
};

export const FacetKeysWorkspace = forwardRef<FacetKeysEditorHandle, FacetKeysWorkspaceProps>(function FacetKeysWorkspace(
  {
    value,
    onChange,
    baselineKeys,
    context,
    onSave,
    savePending,
    saveDisabled,
    compact,
    singleScroll,
    manualOnly,
    importCategoryOptions,
    excludeImportCategoryId,
  },
  ref,
) {
  const { i18n } = useTranslation();
  const isAr = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("ar");
  const localeUi: "en" | "ar" = isAr ? "ar" : "en";
  const iconStorageKey = "admin-facet-icon-overrides:v1";
  const [globalSearch, setGlobalSearch] = useState("");
  const [customNameEn, setCustomNameEn] = useState("");
  const [customNameAr, setCustomNameAr] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [manualHint, setManualHint] = useState("");
  const [manualIconName, setManualIconName] = useState<FacetIconName | "auto">("auto");
  const [manualIconPickerOpen, setManualIconPickerOpen] = useState(false);
  const [iconOverrides, setIconOverrides] = useState<Record<string, FacetIconName>>({});
  const [iconPickerKey, setIconPickerKey] = useState<string | null>(null);
  const [renameKey, setRenameKey] = useState<string | null>(null);
  const [renameEn, setRenameEn] = useState("");
  const [renameAr, setRenameAr] = useState("");
  const [renameError, setRenameError] = useState("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importSourceId, setImportSourceId] = useState<number | null>(null);
  const [importChecks, setImportChecks] = useState<Record<string, boolean>>({});

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = { other: true };
    for (const g of FACET_UI_GROUPS) init[g.id] = true;
    return init;
  });

  const q = globalSearch.trim().toLowerCase();
  const selectedKeySet = useMemo(() => new Set(value.map((a) => a.key)), [value]);

  const importCategoryOptionsFiltered = useMemo(() => {
    if (!importCategoryOptions?.length) return [];
    return importCategoryOptions.filter(
      (c) =>
        c.facetAttributes.length > 0 && (excludeImportCategoryId == null || c.id !== excludeImportCategoryId),
    );
  }, [importCategoryOptions, excludeImportCategoryId]);

  const showImportFromCategory = Boolean(manualOnly && importCategoryOptionsFiltered.length > 0);

  const importSourceCategory = useMemo(
    () => (importSourceId != null ? importCategoryOptionsFiltered.find((c) => c.id === importSourceId) : undefined),
    [importCategoryOptionsFiltered, importSourceId],
  );

  useEffect(() => {
    if (!importModalOpen) return;
    const first = importCategoryOptionsFiltered[0];
    setImportSourceId((prev) => {
      if (prev != null && importCategoryOptionsFiltered.some((c) => c.id === prev)) return prev;
      return first?.id ?? null;
    });
  }, [importModalOpen, importCategoryOptionsFiltered]);

  useEffect(() => {
    if (!importModalOpen || !importSourceCategory) return;
    const have = new Set(value.map((x) => x.key));
    const next: Record<string, boolean> = {};
    for (const a of importSourceCategory.facetAttributes) next[a.key] = !have.has(a.key);
    setImportChecks(next);
  }, [importModalOpen, importSourceCategory, value]);

  useEffect(() => {
    if (importModalOpen && importCategoryOptionsFiltered.length === 0) setImportModalOpen(false);
  }, [importModalOpen, importCategoryOptionsFiltered.length]);

  const visibleGroups = useMemo(() => {
    if (manualOnly) return [];
    return FACET_UI_GROUPS.map((g) => ({
      ...g,
      keys: g.keys.filter((k) => FACET_ADMIN_LABEL_AR[k] && matchesSearch(k, q)),
    })).filter((g) => g.keys.length > 0);
  }, [q, manualOnly]);

  const inGroup = useMemo(() => new Set(FACET_UI_GROUPS.flatMap((g) => g.keys)), []);

  const expandAllGroups = useCallback(() => {
    const next: Record<string, boolean> = { other: true };
    for (const g of FACET_UI_GROUPS) next[g.id] = true;
    setExpanded(next);
  }, []);

  const collapseAllGroups = useCallback(() => {
    const next: Record<string, boolean> = { other: false };
    for (const g of FACET_UI_GROUPS) next[g.id] = false;
    setExpanded(next);
  }, []);

  useEffect(() => {
    if (manualOnly) return;
    if (!q) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const g of FACET_UI_GROUPS) {
        if (g.keys.some((k) => FACET_ADMIN_LABEL_AR[k] && matchesSearch(k, q))) {
          next[g.id] = true;
        }
      }
      if (CATALOG_ORDER.some((k) => !inGroup.has(k) && FACET_ADMIN_LABEL_AR[k] && matchesSearch(k, q))) {
        next.other = true;
      }
      return next;
    });
  }, [q, inGroup, manualOnly]);

  const ungroupedKeys = useMemo(() => {
    if (manualOnly) return [];
    return CATALOG_ORDER.filter((k) => !inGroup.has(k) && matchesSearch(k, q));
  }, [q, inGroup, manualOnly]);

  const otherGroup = useMemo(
    () =>
      ungroupedKeys.length
        ? {
            id: "other",
            titleAr: "حقول إضافية من الكتالوج",
            titleEn: "Additional catalog facets",
            keys: ungroupedKeys,
          }
        : null,
    [ungroupedKeys],
  );

  const visibleKeys = useMemo(() => {
    const keys: string[] = [];
    for (const g of visibleGroups) keys.push(...g.keys);
    if (otherGroup) keys.push(...otherGroup.keys);
    return keys;
  }, [visibleGroups, otherGroup]);

  const selectedInVisible = useMemo(() => visibleKeys.filter((k) => selectedKeySet.has(k)).length, [visibleKeys, selectedKeySet]);
  const allVisibleSelected = visibleKeys.length > 0 && selectedInVisible === visibleKeys.length;
  const someVisibleSelected = selectedInVisible > 0 && !allVisibleSelected;

  const toggleSelectAllVisible = useCallback(() => {
    if (allVisibleSelected) {
      const vis = new Set(visibleKeys);
      onChange(value.filter((a) => !vis.has(a.key)));
    } else {
      const map = new Map(value.map((a) => [a.key, a]));
      for (const k of visibleKeys) {
        if (!map.has(k)) {
          const d = defaultFacetNamesForKey(k);
          map.set(k, { key: k, name_en: d.name_en, name_ar: d.name_ar });
        }
      }
      onChange([...map.values()]);
    }
  }, [allVisibleSelected, onChange, value, visibleKeys]);

  const addCustom = useCallback(() => {
    const nameEn = customNameEn.trim();
    const nameAr = customNameAr.trim();
    if (!nameEn || !nameAr) {
      setManualHint(
        isAr ? "أدخل اسم السمة بالإنجليزية وبالعربية (كلاهما مطلوب)." : "Enter both English and Arabic attribute names (required).",
      );
      return;
    }
    const nextAttr = makeCustomFacetAttribute(nameEn, nameAr);
    const v = validateFacetAttributesForSave([nextAttr]);
    if (!v.ok) {
      setManualHint(v.error);
      return;
    }
    if (value.some((a) => a.key === nextAttr.key)) {
      setManualHint(isAr ? "هذا المفتاح مستخدم بالفعل." : "This attribute key already exists.");
      return;
    }
    const merged = [...value, nextAttr];
    const full = validateFacetAttributesForSave(merged);
    if (!full.ok) {
      setManualHint(full.error);
      return;
    }
    onChange(merged);
    if (manualIconName !== "auto") {
      setIconOverrides((prev) => ({ ...prev, [nextAttr.key]: manualIconName }));
    }
    setManualHint("");
    setCustomNameEn("");
    setCustomNameAr("");
    setManualIconName("auto");
  }, [customNameEn, customNameAr, isAr, manualIconName, onChange, value]);

  useImperativeHandle(
    ref,
    () => ({
      flushPendingCustomBeforeSave: (): boolean => {
        const nameEn = customNameEn.trim();
        const nameAr = customNameAr.trim();
        if (!nameEn && !nameAr) return true;
        if (!nameEn || !nameAr) {
          setManualHint(
            isAr ? "أدخل اسم السمة بالإنجليزية وبالعربية (كلاهما مطلوب) أو امسح الحقول." : "Enter both English and Arabic names, or clear the fields.",
          );
          return false;
        }
        const nextAttr = makeCustomFacetAttribute(nameEn, nameAr);
        const v = validateFacetAttributesForSave([nextAttr]);
        if (!v.ok) {
          setManualHint(v.error);
          return false;
        }
        if (value.some((a) => a.key === nextAttr.key)) {
          setManualHint(isAr ? "هذا المفتاح مستخدم بالفعل." : "This attribute key already exists.");
          return false;
        }
        const merged = [...value, nextAttr];
        const full = validateFacetAttributesForSave(merged);
        if (!full.ok) {
          setManualHint(full.error);
          return false;
        }
        flushSync(() => {
          onChange(merged);
        });
        if (manualIconName !== "auto") {
          setIconOverrides((prev) => ({ ...prev, [nextAttr.key]: manualIconName }));
        }
        setManualHint("");
        setCustomNameEn("");
        setCustomNameAr("");
        setManualIconName("auto");
        return true;
      },
    }),
    [customNameEn, customNameAr, isAr, manualIconName, onChange, value],
  );

  const clearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  const handleReset = useCallback(() => {
    if (baselineKeys === undefined) return;
    onChange([...baselineKeys]);
  }, [baselineKeys, onChange]);

  const selectedCount = value.length;

  const resetDisabled = useMemo(() => {
    if (baselineKeys === undefined) return true;
    return attrsSignature(value) === attrsSignature(baselineKeys);
  }, [value, baselineKeys]);

  useEffect(() => {
    if (!previewOpen && !(compact && editorModalOpen) && !importModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (importModalOpen) setImportModalOpen(false);
      else if (previewOpen) setPreviewOpen(false);
      else setEditorModalOpen(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [previewOpen, compact, editorModalOpen, importModalOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(iconStorageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      const next: Record<string, FacetIconName> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (isFacetIconName(v)) next[k] = v;
      }
      setIconOverrides(next);
    } catch {
      // ignore invalid localStorage
    }
  }, [iconStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(iconStorageKey, JSON.stringify(iconOverrides));
  }, [iconOverrides, iconStorageKey]);

  const orderedSelected = useMemo(() => facetAttributesToOrderedSelection(value), [value]);

  useEffect(() => {
    if (renameKey && !value.some((x) => x.key === renameKey)) {
      setRenameKey(null);
      setRenameEn("");
      setRenameAr("");
      setRenameError("");
    }
  }, [renameKey, value]);

  const beginRename = useCallback((a: FacetAttributeDef) => {
    setRenameKey(a.key);
    setRenameEn(a.name_en);
    setRenameAr(a.name_ar);
    setRenameError("");
  }, []);

  const cancelRename = useCallback(() => {
    setRenameKey(null);
    setRenameEn("");
    setRenameAr("");
    setRenameError("");
  }, []);

  const saveRename = useCallback(() => {
    if (!renameKey) return;
    const name_en = renameEn.trim();
    const name_ar = renameAr.trim();
    if (!name_en || !name_ar) {
      setRenameError(isAr ? "أدخل الاسم بالإنجليزية والعربية." : "Enter both English and Arabic names.");
      return;
    }
    const next = value.map((x) => (x.key === renameKey ? { ...x, name_en, name_ar } : x));
    const v = validateFacetAttributesForSave(next);
    if (!v.ok) {
      setRenameError(v.error);
      return;
    }
    onChange(next);
    cancelRename();
  }, [renameKey, renameEn, renameAr, value, onChange, cancelRename, isAr]);

  const removeQuick = useCallback(
    (key: string) => {
      onChange(value.filter((x) => x.key !== key));
    },
    [onChange, value],
  );

  const moveSelectedBy = useCallback(
    (key: string, delta: -1 | 1) => {
      const idx = value.findIndex((x) => x.key === key);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= value.length) return;
      const next = [...value];
      const [item] = next.splice(idx, 1);
      next.splice(nextIdx, 0, item);
      onChange(next);
    },
    [onChange, value],
  );

  const toggleImportCheck = useCallback((key: string) => {
    setImportChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const setAllImportChecks = useCallback(
    (on: boolean) => {
      if (!importSourceCategory) return;
      const next: Record<string, boolean> = {};
      for (const a of importSourceCategory.facetAttributes) next[a.key] = on;
      setImportChecks(next);
    },
    [importSourceCategory],
  );

  const applyImportFromCategory = useCallback(() => {
    if (!importSourceCategory) return;
    const picked = importSourceCategory.facetAttributes.filter((a) => importChecks[a.key]);
    if (!picked.length) {
      setManualHint(isAr ? "حدد سمة واحدة على الأقل." : "Select at least one attribute.");
      return;
    }
    const have = new Set(value.map((x) => x.key));
    const next = [...value];
    let added = 0;
    let skipped = 0;
    for (const a of picked) {
      if (have.has(a.key)) {
        skipped++;
        continue;
      }
      next.push({ key: a.key, name_en: a.name_en, name_ar: a.name_ar });
      have.add(a.key);
      added++;
    }
    const v = validateFacetAttributesForSave(next);
    if (!v.ok) {
      setManualHint(v.error);
      return;
    }
    onChange(next);
    setImportModalOpen(false);
    const parts: string[] = [];
    if (added) parts.push(isAr ? `أُضيف ${added}` : `Added ${added}`);
    if (skipped) parts.push(isAr ? `تُجاهل ${skipped} (موجود)` : `Skipped ${skipped} (duplicate key)`);
    setManualHint(parts.length ? parts.join(" · ") : "");
  }, [importSourceCategory, importChecks, value, onChange, isAr]);

  const setIconForKey = useCallback((key: string, icon: FacetIconName) => {
    setIconOverrides((prev) => ({ ...prev, [key]: icon }));
  }, []);

  const resetIconForKey = useCallback((key: string) => {
    setIconOverrides((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const toolbar = (
    <FacetAttributeToolbar
      globalSearch={globalSearch}
      onGlobalSearch={setGlobalSearch}
      allVisibleSelected={allVisibleSelected}
      someVisibleSelected={someVisibleSelected}
      visibleCount={visibleKeys.length}
      selectedCount={selectedCount}
      onToggleSelectAllVisible={toggleSelectAllVisible}
      onClearAll={clearAll}
      onReset={baselineKeys !== undefined ? handleReset : undefined}
      resetDisabled={resetDisabled}
      onPreview={() => setPreviewOpen(true)}
      onSave={onSave}
      savePending={savePending}
      saveDisabled={saveDisabled}
    />
  );

  const contextBlock =
    (context?.nameAr || context?.nameEn || context?.slug) && (
      <div className={styles.context}>
        <div>
          <p className={styles.breadcrumb}>
            <Link to="/admin">لوحة التحكم</Link>
            <span aria-hidden> / </span>
            <Link to="/admin/categories">الأقسام</Link>
          </p>
          <h2 className={styles.title}>{context?.nameAr || context?.nameEn || "—"}</h2>
          {context?.nameEn && context.nameAr ? (
            <p className={styles.slug} dir="ltr">
              {context.nameEn}
            </p>
          ) : null}
          {context?.slug ? (
            <p className={styles.slug} dir="ltr">
              slug: {context.slug}
            </p>
          ) : null}
        </div>
        <div className={styles.meta}>
          <span className={styles.metaPill}>{selectedCount} حقول مفعّلة</span>
        </div>
      </div>
    );

  const groupsBlock = (
    <div className={styles.groups}>
      {visibleGroups.map((g) => (
        <AttributeGroupCard
          key={g.id}
          group={g}
          keysInGroup={g.keys}
          value={value}
          expanded={expanded[g.id] ?? true}
          onToggleExpand={() =>
            setExpanded((prev) => ({
              ...prev,
              [g.id]: !(prev[g.id] ?? true),
            }))
          }
          onChange={onChange}
          iconOverrides={iconOverrides}
          onEditIcon={setIconPickerKey}
        />
      ))}

      {otherGroup && (
        <div className={styles.otherCard}>
          <AttributeGroupCard
            group={otherGroup}
            keysInGroup={otherGroup.keys}
            value={value}
            expanded={expanded.other ?? true}
            onToggleExpand={() =>
              setExpanded((prev) => ({
                ...prev,
                other: !(prev.other ?? true),
              }))
            }
            onChange={onChange}
            iconOverrides={iconOverrides}
            onEditIcon={setIconPickerKey}
          />
        </div>
      )}

      {q && visibleGroups.length === 0 && !otherGroup && <p className={styles.hint}>لا توجد حقول مطابقة للبحث الشامل.</p>}
      {manualOnly ? <p className={styles.hint}>تم إخفاء كل السمات الجاهزة — أضف السمات يدويًا فقط.</p> : null}
    </div>
  );

  const expandCollapseRow = (
    <div className={styles.expandRow}>
      <button type="button" className={styles.linkishBtn} onClick={expandAllGroups}>
        توسيع الكل
      </button>
      <span className={styles.expandSep} aria-hidden>
        ·
      </span>
      <button type="button" className={styles.linkishBtn} onClick={collapseAllGroups}>
        طيّ الكل
      </button>
    </div>
  );

  const openImportModal = useCallback(() => {
    setManualHint("");
    setImportModalOpen(true);
  }, []);

  const customBlock = (
    <>
      {showImportFromCategory && orderedSelected.length === 0 ? (
        <div className={styles.importFromCatStrip}>
          <p className={styles.importFromCatHint}>
            {isAr
              ? "يمكنك نسخ السمات المحفوظة من أي قسم آخر إلى هذا القسم."
              : "Copy saved attributes from another category into this one."}
          </p>
          <button type="button" className={styles.importFromCatBtn} onClick={openImportModal}>
            <Copy size={14} aria-hidden />
            {isAr ? "من قسم آخر…" : "From another category…"}
          </button>
        </div>
      ) : null}
      {orderedSelected.length > 0 ? (
        <div className={styles.quickSelectedBox}>
          <div className={styles.quickSelectedHead}>
            <div className={styles.quickSelectedHeadMain}>
              <strong>إزالة سريعة</strong>
              <span>{orderedSelected.length} محدد — رتّب يدويًا</span>
            </div>
            {showImportFromCategory ? (
              <button type="button" className={styles.importFromCatBtn} onClick={openImportModal}>
                <Copy size={14} aria-hidden />
                {isAr ? "من قسم آخر…" : "From another category…"}
              </button>
            ) : null}
          </div>
          <div className={styles.quickSelectedWrap}>
            {orderedSelected.map((a, idx) => (
              <div key={a.key} className={styles.quickSelectedItem}>
                <div className={styles.quickSelectedRow}>
                  <div className={styles.quickSortBtns}>
                    <button
                      type="button"
                      className={styles.quickSortBtn}
                      onClick={() => moveSelectedBy(a.key, -1)}
                      disabled={idx === 0}
                      title="نقل لأعلى"
                      aria-label="نقل السمة لأعلى"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.quickSortBtn}
                      onClick={() => moveSelectedBy(a.key, 1)}
                      disabled={idx === orderedSelected.length - 1}
                      title="نقل لأسفل"
                      aria-label="نقل السمة لأسفل"
                    >
                      ↓
                    </button>
                  </div>
                  <div className={styles.quickSelectedBody}>
                    <div className={styles.quickSelectedMeta}>
                      <code className={styles.quickKey} dir="ltr">
                        {a.key}
                      </code>
                      <span className={styles.quickNames}>
                        <span dir="ltr">{a.name_en}</span>
                        <span className={styles.quickNamesSep} aria-hidden>
                          ·
                        </span>
                        <span dir="rtl">{a.name_ar}</span>
                      </span>
                    </div>
                    <div className={styles.quickRowActions}>
                      <button
                        type="button"
                        className={styles.quickEditBtn}
                        onClick={() => beginRename(a)}
                        title={isAr ? "تعديل الاسم" : "Rename"}
                        aria-label={isAr ? "تعديل الاسم" : "Rename"}
                      >
                        <Pencil size={14} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.quickRemoveBtn}
                        onClick={() => removeQuick(a.key)}
                        title={isAr ? "إزالة" : "Remove"}
                        aria-label={isAr ? "إزالة السمة" : "Remove attribute"}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
                {renameKey === a.key ? (
                  <div className={styles.quickRenamePanel}>
                    <div className={styles.quickRenameFields}>
                      <label className={styles.quickRenameLabel}>
                        <span>{isAr ? "الاسم (إنجليزي)" : "Name (English)"}</span>
                        <input
                          className={styles.customInp}
                          dir="ltr"
                          value={renameEn}
                          onChange={(e) => setRenameEn(e.target.value)}
                        />
                      </label>
                      <label className={styles.quickRenameLabel}>
                        <span>{isAr ? "الاسم (عربي)" : "Name (Arabic)"}</span>
                        <input
                          className={styles.customInp}
                          dir="rtl"
                          value={renameAr}
                          onChange={(e) => setRenameAr(e.target.value)}
                        />
                      </label>
                    </div>
                    {renameError ? <p className={styles.renameError}>{renameError}</p> : null}
                    <div className={styles.quickRenameActions}>
                      <button type="button" className={styles.renameSaveBtn} onClick={() => saveRename()}>
                        {isAr ? "حفظ" : "Save"}
                      </button>
                      <button type="button" className={styles.renameCancelBtn} onClick={cancelRename}>
                        {isAr ? "إلغاء" : "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className={`${styles.customRow} ${styles.customManualForm}`}>
        <div className={styles.customManualFields}>
          <div className={styles.customManualField}>
            <label className={styles.hint} style={{ margin: 0, fontWeight: 600 }}>
              {isAr ? "اسم السمة (إنجليزي) *" : "Attribute name (English) *"}
            </label>
            <input
              className={styles.customInp}
              dir="ltr"
              placeholder="Screen"
              value={customNameEn}
              onChange={(e) => setCustomNameEn(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
          </div>
          <div className={styles.customManualField}>
            <label className={styles.hint} style={{ margin: 0, fontWeight: 600 }}>
              {isAr ? "اسم السمة (عربي) *" : "Attribute name (Arabic) *"}
            </label>
            <input
              className={styles.customInp}
              dir="rtl"
              placeholder="شاشة"
              value={customNameAr}
              onChange={(e) => setCustomNameAr(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustom();
                }
              }}
            />
          </div>
        </div>
        <div className={styles.customManualActions}>
          <button type="button" className={styles.addBtn} onClick={() => setManualIconPickerOpen(true)}>
            {isAr ? "اختيار أيقونة" : "Choose Icon"}
            {manualIconName !== "auto" ? `: ${manualIconName}` : ""}
          </button>
          <button type="button" className={styles.addBtn} onClick={addCustom}>
            {isAr ? "إضافة" : "Add"}
          </button>
        </div>
      </div>
      {manualHint ? <p className={styles.hint}>{manualHint}</p> : null}

      {value.some((a) => !CATALOG_ORDER.includes(a.key)) && (
        <div className={styles.customRow}>
          <span className={styles.hint} style={{ marginInlineEnd: 8 }}>
            مفاتيح مخصّصة خارج الكتالوج:
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {value
              .filter((a) => !CATALOG_ORDER.includes(a.key))
              .map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={styles.addBtn}
                  onClick={() => onChange(value.filter((x) => x.key !== a.key))}
                  title="إزالة"
                >
                  {a.key} ({a.name_en} / {a.name_ar}) ×
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );

  const iconPickerLayer =
    iconPickerKey &&
    (
      <div className={styles.iconPickerBackdrop} onMouseDown={() => setIconPickerKey(null)} role="presentation">
        <div className={styles.iconPickerPanel} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className={styles.iconPickerHead}>
            <h4 className={styles.iconPickerTitle}>تعديل أيقونة الحقل</h4>
            <button type="button" className={styles.iconPickerClose} onClick={() => setIconPickerKey(null)} aria-label="إغلاق">
              ×
            </button>
          </div>
          <p className={styles.iconPickerKey} dir="ltr">
            {iconPickerKey}
          </p>
          <div className={styles.iconPickerGrid}>
            {FACET_ICON_OPTIONS.map((opt) => {
              const Icon = iconFromName(opt.name);
              if (!Icon) return null;
              const active = iconOverrides[iconPickerKey] === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  className={`${styles.iconOption} ${active ? styles.iconOptionActive : ""}`}
                  onClick={() => {
                    setIconForKey(iconPickerKey, opt.name);
                    setIconPickerKey(null);
                  }}
                >
                  <Icon size={18} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.iconResetBtn}
            onClick={() => {
              resetIconForKey(iconPickerKey);
              setIconPickerKey(null);
            }}
          >
            استرجاع الأيقونة التلقائية
          </button>
        </div>
      </div>
    );

  const manualIconPickerLayer =
    manualIconPickerOpen &&
    (
      <div className={styles.iconPickerBackdrop} onMouseDown={() => setManualIconPickerOpen(false)} role="presentation">
        <div className={`${styles.iconPickerPanel} ${styles.iconPickerPanelCompact}`} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className={styles.iconPickerHead}>
            <h4 className={styles.iconPickerTitle}>{isAr ? "اختر أيقونة السمة الجديدة" : "Choose new attribute icon"}</h4>
            <button type="button" className={styles.iconPickerClose} onClick={() => setManualIconPickerOpen(false)} aria-label="إغلاق">
              ×
            </button>
          </div>
          <div className={styles.iconPickerGridCompact}>
            <button
              type="button"
              className={`${styles.iconOptionMini} ${manualIconName === "auto" ? styles.iconOptionActive : ""}`}
              onClick={() => {
                setManualIconName("auto");
                setManualIconPickerOpen(false);
              }}
            >
              <span className={styles.iconCardGlyph}>A</span>
              <span>{isAr ? "تلقائي" : "Auto"}</span>
            </button>
            {FACET_ICON_OPTIONS.map((opt) => {
              const Icon = iconFromName(opt.name);
              if (!Icon) return null;
              const active = manualIconName === opt.name;
              return (
                <button
                  key={opt.name}
                  type="button"
                  className={`${styles.iconOptionMini} ${active ? styles.iconOptionActive : ""}`}
                  onClick={() => {
                    setManualIconName(opt.name);
                    setManualIconPickerOpen(false);
                  }}
                >
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );

  const importModalLayer =
    importModalOpen &&
    importSourceCategory && (
      <div className={styles.iconPickerBackdrop} onMouseDown={() => setImportModalOpen(false)} role="presentation">
        <div
          className={styles.iconPickerPanel}
          onMouseDown={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="facet-import-title"
        >
          <div className={styles.iconPickerHead}>
            <h4 id="facet-import-title" className={styles.iconPickerTitle}>
              {isAr ? "نسخ سمات من قسم آخر" : "Copy attributes from another category"}
            </h4>
            <button type="button" className={styles.iconPickerClose} onClick={() => setImportModalOpen(false)} aria-label="إغلاق">
              ×
            </button>
          </div>
          <label className={styles.importModalSelectLabel}>
            <span>{isAr ? "القسم" : "Category"}</span>
            <select
              className={styles.importModalSelect}
              value={importSourceId ?? ""}
              onChange={(e) => setImportSourceId(Number(e.target.value) || null)}
            >
              {importCategoryOptionsFiltered.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameAr} · {c.nameEn} ({c.slug})
                </option>
              ))}
            </select>
          </label>
          <div className={styles.importModalBulk}>
            <button type="button" className={styles.linkishBtn} onClick={() => setAllImportChecks(true)}>
              {isAr ? "تحديد الكل" : "Select all"}
            </button>
            <span className={styles.expandSep} aria-hidden>
              ·
            </span>
            <button type="button" className={styles.linkishBtn} onClick={() => setAllImportChecks(false)}>
              {isAr ? "إلغاء التحديد" : "Clear"}
            </button>
          </div>
          <div className={styles.importModalList}>
            {importSourceCategory.facetAttributes.map((a) => {
              const already = selectedKeySet.has(a.key);
              return (
                <label key={a.key} className={styles.importModalRow}>
                  <input type="checkbox" checked={Boolean(importChecks[a.key])} onChange={() => toggleImportCheck(a.key)} />
                  <span className={styles.importModalRowText}>
                    <code className={styles.quickKey} dir="ltr">
                      {a.key}
                    </code>
                    <span className={styles.quickNames}>
                      <span dir="ltr">{a.name_en}</span>
                      <span className={styles.quickNamesSep} aria-hidden>
                        ·
                      </span>
                      <span dir="rtl">{a.name_ar}</span>
                      {already ? (
                        <span className={styles.importAlready}>{isAr ? " (موجود هنا)" : " (already in list)"}</span>
                      ) : null}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <div className={styles.importModalFooter}>
            <button type="button" className={styles.renameSaveBtn} onClick={() => applyImportFromCategory()}>
              {isAr ? "إضافة للقائمة" : "Add to list"}
            </button>
            <button type="button" className={styles.renameCancelBtn} onClick={() => setImportModalOpen(false)}>
              {isAr ? "إلغاء" : "Cancel"}
            </button>
          </div>
        </div>
      </div>
    );

  const editorScroll = (
    <>
      {contextBlock}
      {!manualOnly ? expandCollapseRow : null}
      {groupsBlock}
      {customBlock}
    </>
  );

  const editorChrome = (
    <div className={styles.editorStack}>
      <div className={singleScroll ? styles.toolbarInline : styles.toolbarSticky}>{toolbar}</div>
      <div className={singleScroll ? styles.editorScrollInline : styles.editorScroll}>{editorScroll}</div>
    </div>
  );

  const previewLayer =
    previewOpen &&
    (
      <div
        className={styles.previewBackdrop}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setPreviewOpen(false);
        }}
      >
        <div className={styles.previewDialog} role="dialog" aria-modal="true" aria-labelledby="facet-preview-title">
          <div className={styles.previewDialogHead}>
            <h3 id="facet-preview-title" className={styles.previewTitle}>
              معاينة ترتيب الفلاتر
            </h3>
            <button type="button" className={styles.previewHeadClose} onClick={() => setPreviewOpen(false)} aria-label="إغلاق">
              ×
            </button>
          </div>
          <p className={styles.previewSub}>هكذا سيظهر تسلسل الفلاتر للزائر (حسب ترتيب الكتالوج).</p>
          <div className={styles.previewChips}>
            {facetAttributesToOrderedSelection(value).map((a) => (
              <span key={a.key} className={styles.previewChip} dir="ltr">
                {facetAttributeDisplayName(a, localeUi)} ({a.key})
              </span>
            ))}
          </div>
          <button type="button" className={styles.previewClose} onClick={() => setPreviewOpen(false)}>
            إغلاق
          </button>
        </div>
      </div>
    );

  if (compact) {
    return (
      <>
        <div className={styles.compactBar}>
          <div className={styles.compactBarText}>
            <div className={styles.compactBarTitle}>الحقول والفلاتر</div>
            <p className={styles.compactBarSub}>
              {selectedCount} حقل مفعّل — افتح النافذة لإدارة السمات في شبكة مدمجة دون عمود جانبي.
            </p>
          </div>
          <button type="button" className={styles.compactOpenBtn} onClick={() => setEditorModalOpen(true)}>
            فتح محرّر الحقول
          </button>
        </div>

        {editorModalOpen ? (
          <div
            className={styles.attrModalBackdrop}
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setEditorModalOpen(false);
            }}
          >
            <div
              className={styles.attrModalPanel}
              role="dialog"
              aria-modal="true"
              aria-labelledby="facet-editor-modal-title"
            >
              <div className={styles.attrModalHead}>
                <h2 id="facet-editor-modal-title" className={styles.attrModalTitle}>
                  محرّر الحقول والفلاتر
                </h2>
                <button type="button" className={styles.attrModalClose} onClick={() => setEditorModalOpen(false)} aria-label="إغلاق">
                  ×
                </button>
              </div>
              <div className={styles.attrModalBody}>
                <div className={styles.modalEditorRoot}>{editorChrome}</div>
              </div>
            </div>
          </div>
        ) : null}

        {previewLayer}
        {iconPickerLayer}
        {manualIconPickerLayer}
        {importModalLayer}
      </>
    );
  }

  return (
    <div className={styles.pageRoot}>
      {editorChrome}
      {previewLayer}
      {iconPickerLayer}
      {manualIconPickerLayer}
      {importModalLayer}
    </div>
  );
});
