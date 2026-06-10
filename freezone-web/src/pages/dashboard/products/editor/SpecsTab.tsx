/**
 * Specs & attributes tab — per-category attribute values (these drive the
 * storefront filters) + free-form display specs + a raw-JSON escape hatch.
 */
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { Badge, Button, Field, Input, Select, Textarea } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import type { CategoryAttributeDef } from "@/lib/dashboard/api";
import { buildSpecsPayload, type EditorForm, type FieldErrors } from "./form";
import s from "./editor.module.css";

type SpecsTabProps = {
  form: EditorForm;
  set: <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => void;
  errors: FieldErrors;
  attributes: CategoryAttributeDef[];
};

function attrTypeLabelKey(type: CategoryAttributeDef["type"]) {
  return `catAttrs.type${type ?? "TEXT"}` as const;
}

function FilterValueInput({
  attr,
  value,
  onChange,
}: {
  attr: CategoryAttributeDef;
  value: string;
  onChange: (next: string) => void;
}) {
  const { t } = useDashboardLocale();
  const type = attr.type ?? "TEXT";

  if ((type === "SELECT" || type === "MULTI_SELECT" || type === "COLOR") && attr.options?.length) {
    const options = [
      { value: "", label: t("common.noneOption") },
      ...attr.options.map((o) => ({ value: o, label: o })),
    ];
    // MULTI_SELECT values are stored as a single token per product attribute
    // value — the category options list is the allowed vocabulary.
    return <Select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)} options={options} />;
  }
  if (type === "BOOLEAN") {
    const options = [
      { value: "", label: t("common.noneOption") },
      { value: "true", label: t("common.yes") },
      { value: "false", label: t("common.no") },
    ];
    return <Select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)} options={options} />;
  }
  if (type === "RANGE") {
    return (
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={attr.unit ?? ""}
      />
    );
  }
  return <Input value={value} onChange={(e) => onChange(e.target.value)} />;
}

export function SpecsTab({ form, set, errors, attributes }: SpecsTabProps) {
  const { t, lang } = useDashboardLocale();

  const filterable = attributes.filter((a) => a.filterable);
  const displayOnly = attributes.filter((a) => !a.filterable);

  const setFilterValue = (key: string, value: string) =>
    set("filterValues", { ...form.filterValues, [key]: value });
  const setDisplayValue = (key: string, value: string) =>
    set("displayValues", { ...form.displayValues, [key]: value });

  const setExtra = (index: number, patch: Partial<{ key: string; value: string }>) => {
    const next = form.extraSpecs.map((row, i) => (i === index ? { ...row, ...patch } : row));
    set("extraSpecs", next);
  };
  const removeExtra = (index: number) =>
    set("extraSpecs", form.extraSpecs.filter((_, i) => i !== index));
  const addExtra = () => set("extraSpecs", [...form.extraSpecs, { key: "", value: "" }]);

  const toggleJsonMode = () => {
    if (!form.specsJsonMode) {
      set("specsJson", JSON.stringify(buildSpecsPayload(form, attributes), null, 2));
    }
    set("specsJsonMode", !form.specsJsonMode);
  };

  const attrLabel = (attr: CategoryAttributeDef) =>
    lang === "ar" ? attr.name_ar || attr.name_en : attr.name_en;

  return (
    <>
      <div className={s.flagsRow}>
        <label className={s.checkboxLabel}>
          <input type="checkbox" checked={form.specsJsonMode} onChange={toggleJsonMode} />
          {t("editor.specsJsonToggle")}
        </label>
      </div>

      {form.specsJsonMode ? (
        <Field
          label={t("editor.specsJsonLabel")}
          hint={t("editor.specsJsonHint")}
          error={errors.specsJson}
        >
          <Textarea
            className={s.jsonArea}
            invalid={Boolean(errors.specsJson)}
            value={form.specsJson}
            onChange={(e) => set("specsJson", e.target.value)}
            spellCheck={false}
            dir="ltr"
          />
        </Field>
      ) : (
        <>
          {attributes.length === 0 && (
            <div className={s.noticeBox}>
              <span>{t("editor.specsNoSchema")}</span>
              {form.categoryId && (
                <Link to={`/admin/categories/${form.categoryId}/attributes`}>
                  {t("editor.specsOpenBuilder")}
                </Link>
              )}
            </div>
          )}

          {filterable.length > 0 && (
            <div>
              <h3 className={s.sectionTitle}>{t("editor.specsFilterTitle")}</h3>
              <div className={s.sectionHint}>{t("editor.specsFilterHint")}</div>
              <div className={s.specRow} aria-hidden>
                <span className={s.specRowHead}>{t("catAttrs.key")}</span>
                <span className={s.specRowHead}>{t("editor.specsFilterTitle")}</span>
                <span className={s.specRowHead}>{t("editor.specsDisplayTitle")}</span>
              </div>
              {filterable.map((attr) => {
                const displayKey = attr.displaySpecKey || attr.key;
                return (
                  <div key={attr.key} className={s.specRow}>
                    <div className={s.specName}>
                      <span className={s.specLabel}>
                        {attrLabel(attr)}
                        {attr.unit ? ` (${attr.unit})` : ""}
                      </span>
                      <span className={s.specKey}>{attr.key}</span>
                      <span className={s.specBadges}>
                        <Badge tone="info">{t(attrTypeLabelKey(attr.type))}</Badge>
                        {attr.required && <Badge tone="warning">{t("catAttrs.required")}</Badge>}
                      </span>
                    </div>
                    <FilterValueInput
                      attr={attr}
                      value={form.filterValues[attr.key] ?? ""}
                      onChange={(v) => setFilterValue(attr.key, v)}
                    />
                    <Input
                      value={form.displayValues[displayKey] ?? ""}
                      onChange={(e) => setDisplayValue(displayKey, e.target.value)}
                      placeholder={t("editor.specsDisplayHint")}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {displayOnly.length > 0 && (
            <div>
              <h3 className={s.sectionTitle}>{t("editor.specsDisplayTitle")}</h3>
              <div className={s.sectionHint}>{t("editor.specsDisplayHint")}</div>
              {displayOnly.map((attr) => (
                <div key={attr.key} className={s.specRow}>
                  <div className={s.specName}>
                    <span className={s.specLabel}>{attrLabel(attr)}</span>
                    <span className={s.specKey}>{attr.key}</span>
                  </div>
                  <Input
                    value={form.displayValues[attr.key] ?? ""}
                    onChange={(e) => setDisplayValue(attr.key, e.target.value)}
                  />
                  <span />
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className={s.sectionTitle}>{t("editor.specsAddRow")}</h3>
            <div className={s.sectionHint}>{t("editor.specsDisplayHint")}</div>
            {form.extraSpecs.map((row, i) => (
              <div key={i} className={s.freeSpecRow}>
                <Input
                  value={row.key}
                  onChange={(e) => setExtra(i, { key: e.target.value })}
                  placeholder={t("editor.specsFreeKey")}
                />
                <Input
                  value={row.value}
                  onChange={(e) => setExtra(i, { value: e.target.value })}
                  placeholder={t("editor.specsFreeValue")}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  type="button"
                  aria-label={t("common.remove")}
                  onClick={() => removeExtra(i)}
                >
                  <Trash2 size={15} aria-hidden />
                </Button>
              </div>
            ))}
            <div>
              <Button variant="secondary" size="sm" type="button" onClick={addExtra}>
                <Plus size={14} aria-hidden /> {t("editor.specsAddRow")}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
