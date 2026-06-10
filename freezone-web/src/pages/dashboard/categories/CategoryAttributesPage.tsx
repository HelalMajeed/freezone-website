/**
 * Category attribute & filter builder — /dashboard/categories/:id/attributes.
 *
 * Edits the bilingual attribute schema (type, options, filterable/required/…)
 * that drives the storefront filters, applies attribute templates, and shows
 * category stats. The write path is the category PATCH with `facetKeys`
 * (categoryAttributesApi.set) — the server syncs CategoryAttribute rows.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, LayoutTemplate, Plus, X } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Drawer,
  EmptyState,
  Field,
  Input,
  Select,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import {
  categoryAttributesApi,
  type CategoryAttributeDef,
  type CategoryAttributeType,
  type CategoryTemplateSummary,
} from "@/lib/dashboard/api";
import { categoryStatsApi, type CategoryStats } from "@/lib/dashboard/api-extra";
import { formatIqd } from "../products/shared";
import { useGuardedNavigate, useUnsavedGuard } from "../useUnsavedGuard";
import s from "./attributes.module.css";

const ATTR_TYPES: CategoryAttributeType[] = [
  "SELECT",
  "MULTI_SELECT",
  "RANGE",
  "BOOLEAN",
  "TEXT",
  "COLOR",
];

const TYPE_TONE: Record<CategoryAttributeType, "info" | "brand" | "warning" | "neutral" | "success"> = {
  SELECT: "info",
  MULTI_SELECT: "brand",
  RANGE: "warning",
  BOOLEAN: "neutral",
  TEXT: "neutral",
  COLOR: "success",
};

type AttrDraft = {
  key: string;
  name_en: string;
  name_ar: string;
  type: CategoryAttributeType;
  options: string[];
  filterable: boolean;
  required: boolean;
  searchable: boolean;
  comparable: boolean;
  unit: string;
  displayGroup: string;
};

const EMPTY_DRAFT: AttrDraft = {
  key: "",
  name_en: "",
  name_ar: "",
  type: "SELECT",
  options: [],
  filterable: true,
  required: false,
  searchable: false,
  comparable: false,
  unit: "",
  displayGroup: "",
};

function toDraft(def: CategoryAttributeDef): AttrDraft {
  return {
    key: def.key,
    name_en: def.name_en,
    name_ar: def.name_ar,
    type: def.type ?? "TEXT",
    options: def.options ?? [],
    filterable: def.filterable ?? false,
    required: def.required ?? false,
    searchable: def.searchable ?? false,
    comparable: def.comparable ?? false,
    unit: def.unit ?? "",
    displayGroup: def.displayGroup ?? "",
  };
}

function fromDraft(draft: AttrDraft, original?: CategoryAttributeDef): CategoryAttributeDef {
  const needsOptions =
    draft.type === "SELECT" || draft.type === "MULTI_SELECT" || draft.type === "COLOR";
  return {
    // Preserve fields the form doesn't edit (displaySpecKey links, …).
    ...(original ?? {}),
    key: draft.key.trim(),
    name_en: draft.name_en.trim(),
    name_ar: draft.name_ar.trim() || draft.name_en.trim(),
    type: draft.type,
    options: needsOptions ? draft.options : undefined,
    filterable: draft.filterable,
    required: draft.required,
    searchable: draft.searchable,
    comparable: draft.comparable,
    unit: draft.unit.trim() || undefined,
    displayGroup: draft.displayGroup.trim() || undefined,
  };
}

export function DashboardCategoryAttributesPage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const params = useParams<{ id: string }>();
  const categoryId = parseInt(params.id ?? "", 10);

  const [attributes, setAttributes] = useState<CategoryAttributeDef[]>([]);
  const [baseline, setBaseline] = useState<string>("[]");
  const [categoryName, setCategoryName] = useState<{ en: string; ar: string } | null>(null);
  const [stats, setStats] = useState<CategoryStats | null>(null);
  const [templates, setTemplates] = useState<CategoryTemplateSummary[]>([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Drawer editor state.
  const [draft, setDraft] = useState<AttrDraft | null>(null);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draftErrors, setDraftErrors] = useState<Partial<Record<string, string>>>({});
  const [optionInput, setOptionInput] = useState("");

  const localeRef = useRef({ formatError });
  localeRef.current = { formatError };

  const dirty = JSON.stringify(attributes) !== baseline;
  useUnsavedGuard(dirty);
  const guardedNavigate = useGuardedNavigate(dirty);

  const load = useCallback(async () => {
    if (!Number.isFinite(categoryId)) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [attrs, statsRes] = await Promise.all([
        categoryAttributesApi.get(categoryId),
        categoryStatsApi.get(categoryId).catch(() => null),
      ]);
      setAttributes(attrs.categoryAttributes ?? []);
      setBaseline(JSON.stringify(attrs.categoryAttributes ?? []));
      if (statsRes) {
        setStats(statsRes);
        setCategoryName({ en: statsRes.category.nameEn, ar: statsRes.category.nameAr });
      } else {
        setCategoryName({ en: attrs.slug, ar: attrs.slug });
      }
    } catch (e) {
      setLoadError(localeRef.current.formatError(e));
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    categoryAttributesApi.templates().then(setTemplates).catch(() => {});
  }, []);

  const saveAll = async () => {
    setSaving(true);
    try {
      await categoryAttributesApi.set(categoryId, attributes);
      setBaseline(JSON.stringify(attributes));
      toast.success(t("catAttrs.savedToast"));
      // Attribute count changed — refresh the stats card.
      categoryStatsApi.get(categoryId).then(setStats).catch(() => {});
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setSaving(false);
    }
  };

  // ── Drawer editor ─────────────────────────────────────────────────────────
  const openNew = () => {
    setDraft({ ...EMPTY_DRAFT });
    setEditingKey(null);
    setDraftErrors({});
    setOptionInput("");
  };

  const openEdit = (def: CategoryAttributeDef) => {
    setDraft(toDraft(def));
    setEditingKey(def.key);
    setDraftErrors({});
    setOptionInput("");
  };

  const patchDraft = (patch: Partial<AttrDraft>) =>
    setDraft((d) => (d ? { ...d, ...patch } : d));

  const addOption = () => {
    const value = optionInput.trim();
    if (!value || !draft) return;
    if (!draft.options.includes(value)) patchDraft({ options: [...draft.options, value] });
    setOptionInput("");
  };

  const applyDraft = () => {
    if (!draft) return;
    const errors: Partial<Record<string, string>> = {};
    const key = draft.key.trim();
    if (!/^[a-z0-9_]+$/.test(key)) errors.key = t("catAttrs.errKey");
    if (
      key &&
      key !== editingKey &&
      attributes.some((a) => a.key === key)
    ) {
      errors.key = t("catAttrs.errKeyDuplicate");
    }
    if (!draft.name_en.trim()) errors.name_en = t("catAttrs.errName");
    const needsOptions =
      draft.type === "SELECT" || draft.type === "MULTI_SELECT" || draft.type === "COLOR";
    if (needsOptions && draft.options.length === 0) errors.options = t("catAttrs.errOptions");
    setDraftErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (editingKey) {
      setAttributes((prev) =>
        prev.map((a) => (a.key === editingKey ? fromDraft(draft, a) : a)),
      );
    } else {
      setAttributes((prev) => [...prev, fromDraft(draft)]);
    }
    setDraft(null);
    setEditingKey(null);
  };

  const removeAttribute = async (def: CategoryAttributeDef) => {
    const ok = await confirm({
      title: t("catAttrs.removeTitle"),
      message: t("catAttrs.removeMessage", { key: def.key }),
      tone: "danger",
      confirmLabel: t("common.remove"),
    });
    if (!ok) return;
    setAttributes((prev) => prev.filter((a) => a.key !== def.key));
  };

  // ── Templates ─────────────────────────────────────────────────────────────
  const applyTemplate = async (template: CategoryTemplateSummary) => {
    const ok = await confirm({
      title: t("catAttrs.templateConfirmTitle"),
      message: t("catAttrs.templateConfirmMessage", {
        name: lang === "ar" ? template.nameAr : template.nameEn,
        count: template.attributeCount,
      }),
    });
    if (!ok) return;
    try {
      const res = await categoryAttributesApi.applyTemplate(categoryId, template.id);
      toast.success(t("catAttrs.templateApplied", { count: res.categoryAttributes }));
      setTemplatesOpen(false);
      await load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (!Number.isFinite(categoryId)) {
    return <div className={s.errorBox}>{t("editor.notFound")}</div>;
  }

  const attrLabel = (def: CategoryAttributeDef) =>
    lang === "ar" ? def.name_ar || def.name_en : def.name_en;

  const typeOptions = ATTR_TYPES.map((type) => ({
    value: type,
    label: t(`catAttrs.type${type}`),
  }));

  const draftNeedsOptions =
    draft && (draft.type === "SELECT" || draft.type === "MULTI_SELECT" || draft.type === "COLOR");

  return (
    <div className={s.page}>
      <div className="dashboard-page-header">
        <div>
          <button
            type="button"
            className={s.backLink}
            onClick={() => guardedNavigate("/admin/categories")}
          >
            <ArrowLeft size={14} className={s.dirIcon} aria-hidden />
            {t("catAttrs.backToCategories")}
          </button>
          <h1 className="dashboard-page-title">
            {t("catAttrs.title")}
            {categoryName ? ` — ${lang === "ar" ? categoryName.ar : categoryName.en}` : ""}
          </h1>
          <div className="dashboard-page-subtitle">{t("catAttrs.subtitle")}</div>
        </div>
        <div className={s.headerActions}>
          {dirty && (
            <span className={s.unsavedBadge}>
              <Badge tone="warning">{t("catAttrs.unsaved")}</Badge>
            </span>
          )}
          <Button variant="secondary" onClick={() => setTemplatesOpen(true)}>
            <LayoutTemplate size={15} aria-hidden /> {t("catAttrs.templates")}
          </Button>
          <Button variant="secondary" onClick={openNew}>
            <Plus size={15} aria-hidden /> {t("catAttrs.add")}
          </Button>
          <Button loading={saving} disabled={!dirty} onClick={() => void saveAll()}>
            {t("common.save")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loader" />
      ) : loadError ? (
        <div className={s.errorBox}>{loadError}</div>
      ) : (
        <div className={s.layout}>
          <Card title={t("catAttrs.listTitle", { count: attributes.length })} tight>
            {attributes.length === 0 ? (
              <EmptyState
                title={t("catAttrs.empty")}
                action={
                  <Button variant="secondary" onClick={openNew}>
                    <Plus size={15} aria-hidden /> {t("catAttrs.add")}
                  </Button>
                }
              />
            ) : (
              attributes.map((def) => (
                <div key={def.key} className={s.attrRow}>
                  <div className={s.attrInfo}>
                    <span className={s.attrName}>
                      {attrLabel(def)}
                      {def.unit ? ` (${def.unit})` : ""}
                    </span>
                    <span className={s.attrKey}>{def.key}</span>
                    <span className={s.attrBadges}>
                      <Badge tone={TYPE_TONE[def.type ?? "TEXT"]}>
                        {t(`catAttrs.type${def.type ?? "TEXT"}`)}
                      </Badge>
                      {def.filterable && <Badge tone="brand">{t("catAttrs.filterable")}</Badge>}
                      {def.required && <Badge tone="warning">{t("catAttrs.required")}</Badge>}
                      {def.searchable && <Badge>{t("catAttrs.searchable")}</Badge>}
                      {def.comparable && <Badge>{t("catAttrs.comparable")}</Badge>}
                    </span>
                    {def.options && def.options.length > 0 && (
                      <span className={s.chips}>
                        {def.options.map((opt) => (
                          <span key={opt} className={s.chip}>
                            {opt}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                  <div className={s.attrActions}>
                    <Button size="sm" variant="secondary" onClick={() => openEdit(def)}>
                      {t("common.edit")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void removeAttribute(def)}>
                      {t("common.remove")}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </Card>

          <Card title={t("catAttrs.statsTitle")}>
            {stats ? (
              <div className={s.statsGrid}>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t("catAttrs.statActive")}</span>
                  <span className={s.statValue}>{stats.counts.active}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t("catAttrs.statDraft")}</span>
                  <span className={s.statValue}>{stats.counts.draft}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t("catAttrs.statArchived")}</span>
                  <span className={s.statValue}>{stats.counts.archived}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t("catAttrs.statAttributes")}</span>
                  <span className={s.statValue}>{stats.attributeCount}</span>
                </div>
                <div className={s.stat}>
                  <span className={s.statLabel}>{t("catAttrs.statAvgPrice")}</span>
                  <span className={s.statValue}>{formatIqd(stats.avgPrice, lang)}</span>
                </div>
              </div>
            ) : (
              <div className="dashboard-loader" />
            )}
          </Card>
        </div>
      )}

      {/* Attribute editor drawer */}
      <Drawer
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={editingKey ? t("catAttrs.editTitle") : t("catAttrs.newTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={applyDraft}>{t("common.apply")}</Button>
          </>
        }
      >
        {draft && (
          <div className={s.drawerForm}>
            <Field label={t("catAttrs.key")} hint={t("catAttrs.keyHint")} required error={draftErrors.key}>
              <Input
                value={draft.key}
                invalid={Boolean(draftErrors.key)}
                dir="ltr"
                onChange={(e) => patchDraft({ key: e.target.value })}
                placeholder="ram_gb"
              />
            </Field>
            <Field label={t("catAttrs.nameEn")} required error={draftErrors.name_en}>
              <Input
                value={draft.name_en}
                invalid={Boolean(draftErrors.name_en)}
                onChange={(e) => patchDraft({ name_en: e.target.value })}
                placeholder="RAM"
              />
            </Field>
            <Field label={t("catAttrs.nameAr")}>
              <Input
                value={draft.name_ar}
                dir="rtl"
                onChange={(e) => patchDraft({ name_ar: e.target.value })}
                placeholder="الذاكرة"
              />
            </Field>
            <Field label={t("catAttrs.type")}>
              <Select
                value={draft.type}
                onChange={(e) =>
                  patchDraft({ type: (e.target as HTMLSelectElement).value as CategoryAttributeType })
                }
                options={typeOptions}
              />
            </Field>
            {draftNeedsOptions && (
              <Field label={t("catAttrs.options")} hint={t("catAttrs.optionsHint")} error={draftErrors.options}>
                <div className={s.drawerForm}>
                  <div className={s.chips}>
                    {draft.options.map((opt) => (
                      <span key={opt} className={s.chip}>
                        {opt}
                        <button
                          type="button"
                          className={s.chipRemove}
                          aria-label={t("common.remove")}
                          onClick={() =>
                            patchDraft({ options: draft.options.filter((o) => o !== opt) })
                          }
                        >
                          <X size={12} aria-hidden />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className={s.optionAddRow}>
                    <Input
                      value={optionInput}
                      placeholder={t("catAttrs.optionPlaceholder")}
                      onChange={(e) => setOptionInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addOption();
                        }
                      }}
                    />
                    <Button size="sm" variant="secondary" type="button" onClick={addOption}>
                      {t("common.add")}
                    </Button>
                  </div>
                </div>
              </Field>
            )}
            <div className={s.grid2}>
              <Field label={t("catAttrs.unit")} hint={t("common.optional")}>
                <Input value={draft.unit} onChange={(e) => patchDraft({ unit: e.target.value })} placeholder="GB" />
              </Field>
              <Field label={t("catAttrs.group")} hint={t("common.optional")}>
                <Input
                  value={draft.displayGroup}
                  onChange={(e) => patchDraft({ displayGroup: e.target.value })}
                />
              </Field>
            </div>
            <div className={s.flagsRow}>
              <label className={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={draft.filterable}
                  onChange={(e) => patchDraft({ filterable: e.target.checked })}
                />
                {t("catAttrs.filterable")}
              </label>
              <label className={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => patchDraft({ required: e.target.checked })}
                />
                {t("catAttrs.required")}
              </label>
              <label className={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={draft.searchable}
                  onChange={(e) => patchDraft({ searchable: e.target.checked })}
                />
                {t("catAttrs.searchable")}
              </label>
              <label className={s.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={draft.comparable}
                  onChange={(e) => patchDraft({ comparable: e.target.checked })}
                />
                {t("catAttrs.comparable")}
              </label>
            </div>
          </div>
        )}
      </Drawer>

      {/* Templates drawer */}
      <Drawer
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        title={t("catAttrs.templatesTitle")}
      >
        {templates.length === 0 ? (
          <EmptyState title={t("common.noData")} />
        ) : (
          templates.map((template) => (
            <div key={template.id} className={s.templateRow}>
              <div className={s.templateInfo}>
                <span className={s.templateName}>
                  {lang === "ar" ? template.nameAr : template.nameEn}
                </span>
                <span className={s.templateCount}>
                  {t("catAttrs.templateAttrCount", { count: template.attributeCount })}
                </span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => void applyTemplate(template)}>
                {t("catAttrs.templateApply")}
              </Button>
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}

export default DashboardCategoryAttributesPage;
