/**
 * Variants tab — lists/edits ProductVariant rows. Variants persist separately
 * from the product via `POST /api/admin/products/:id/variants` (idempotent
 * upsert keyed by sourceVariantId). The endpoint never deletes — rows are
 * deactivated instead.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Plus } from "lucide-react";
import { Badge, Button, Field, Input, useToast } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { variantsApi, type ProductVariantInput } from "@/lib/dashboard/api";
import s from "./editor.module.css";

type VariantRow = {
  /** Server id — undefined for unsaved rows. */
  id?: number;
  sourceVariantId: string | null;
  sku: string;
  labelEn: string;
  labelAr: string;
  priceOverride: string;
  oldPrice: string;
  quantity: string;
  active: boolean;
  sortOrder: number;
  options: Array<{ name: string; value: string }>;
};

/**
 * Parse a price input. Empty → null (clears the override); a finite,
 * non-negative integer → that number; anything else (e.g. pasted non-numeric
 * text that slips past the number input) → `undefined`, signalling invalid so
 * the caller can block the save instead of silently dropping the value to null.
 */
function parsePrice(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = parseInt(trimmed, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function newVariantRow(sortOrder: number): VariantRow {
  return {
    sourceVariantId: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sku: "",
    labelEn: "",
    labelAr: "",
    priceOverride: "",
    oldPrice: "",
    quantity: "0",
    active: true,
    sortOrder,
    options: [
      { name: "", value: "" },
      { name: "", value: "" },
      { name: "", value: "" },
    ],
  };
}

/** Result of flushing pending variant edits during the editor's unified save. */
export type VariantFlushResult = "ok" | "invalid" | "error";

export type VariantsTabHandle = {
  /** True when the rows differ from the last loaded/saved baseline. */
  isDirty: () => boolean;
  /** Persist pending variant edits silently (no own toasts). Resolves "ok" when
   *  saved or there was nothing to save, "invalid" on price validation failure,
   *  "error" on a request failure — so the caller can surface one message. */
  flush: () => Promise<VariantFlushResult>;
};

export const VariantsTab = forwardRef<
  VariantsTabHandle,
  {
    productId: number | null;
    /** Reports whether the variant rows differ from the loaded baseline, so the
     *  parent editor can fold it into its unsaved-changes guard. */
    onDirtyChange?: (dirty: boolean) => void;
  }
>(function VariantsTab({ productId, onDirtyChange }, ref) {
  const { t, formatError } = useDashboardLocale();
  const toast = useToast();
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Serialized snapshot of the last-loaded/saved rows — anything different means
  // there are unsaved variant edits.
  const baselineRef = useRef<string>(JSON.stringify([] as VariantRow[]));

  // Stable ref so a language switch never re-triggers the loader (it would
  // clobber unsaved variant edits).
  const localeRef = useRef({ formatError, toast });
  localeRef.current = { formatError, toast };

  const load = useCallback(async () => {
    if (productId == null) return;
    setLoading(true);
    try {
      const variants = await variantsApi.list(productId);
      const mapped: VariantRow[] = variants.map((v) => ({
        id: v.id,
        sourceVariantId: v.sourceVariantId,
        sku: v.sku,
        labelEn: v.labelEn,
        labelAr: v.labelAr,
        priceOverride: v.priceOverride != null ? String(v.priceOverride) : "",
        oldPrice: v.oldPrice != null ? String(v.oldPrice) : "",
        quantity: String(v.quantity),
        active: v.active,
        sortOrder: v.sortOrder,
        options: [
          { name: v.optionName1 ?? "", value: v.optionValue1 ?? "" },
          { name: v.optionName2 ?? "", value: v.optionValue2 ?? "" },
          { name: v.optionName3 ?? "", value: v.optionValue3 ?? "" },
        ],
      }));
      baselineRef.current = JSON.stringify(mapped);
      setRows(mapped);
    } catch (e) {
      localeRef.current.toast.error(localeRef.current.formatError(e));
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = JSON.stringify(rows) !== baselineRef.current;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  // On unmount (e.g. switching tabs), clear the dirty signal — the row state is
  // gone, so there is nothing left for the guard to protect.
  useEffect(() => () => onDirtyChange?.(false), [onDirtyChange]);

  const patch = (index: number, patchRow: Partial<VariantRow>) =>
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patchRow } : r)));

  const patchOption = (index: number, optIndex: number, field: "name" | "value", value: string) =>
    setRows((prev) =>
      prev.map((r, i) =>
        i === index
          ? {
              ...r,
              options: r.options.map((o, oi) => (oi === optIndex ? { ...o, [field]: value } : o)),
            }
          : r,
      ),
    );

  const runSave = async (opts?: { quiet?: boolean }): Promise<VariantFlushResult> => {
    if (productId == null) return "ok";
    const editable = rows.filter((r) => r.sourceVariantId);
    if (editable.some((r) => parsePrice(r.priceOverride) === undefined || parsePrice(r.oldPrice) === undefined)) {
      if (!opts?.quiet) toast.error(t("editor.variantsPriceInvalid"));
      return "invalid";
    }
    const payload: ProductVariantInput[] = editable.map((r, i) => ({
      sourceVariantId: r.sourceVariantId,
      sku: r.sku.trim(),
      labelEn: r.labelEn.trim(),
      labelAr: r.labelAr.trim(),
      priceOverride: parsePrice(r.priceOverride),
      oldPrice: parsePrice(r.oldPrice),
      quantity: r.quantity.trim() ? Math.max(0, parseInt(r.quantity, 10) || 0) : 0,
      active: r.active,
      sortOrder: i,
      optionName1: r.options[0].name.trim() || null,
      optionValue1: r.options[0].value.trim() || null,
      optionName2: r.options[1].name.trim() || null,
      optionValue2: r.options[1].value.trim() || null,
      optionName3: r.options[2].name.trim() || null,
      optionValue3: r.options[2].value.trim() || null,
    }));
    setSaving(true);
    try {
      await variantsApi.upsert(productId, payload);
      if (!opts?.quiet) toast.success(t("editor.variantsSaved"));
      await load();
      return "ok";
    } catch (e) {
      if (!opts?.quiet) toast.error(formatError(e));
      return "error";
    } finally {
      setSaving(false);
    }
  };

  const save = () => void runSave();

  // Let the parent editor fold variant persistence into its primary Save.
  useImperativeHandle(
    ref,
    () => ({
      isDirty: () => dirty,
      flush: () => (dirty ? runSave({ quiet: true }) : Promise.resolve<VariantFlushResult>("ok")),
    }),
    // `runSave` is recreated each render (it closes over `rows`); listing `dirty`
    // and `rows` keeps the exposed handle current for a synchronous save call.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dirty, rows, productId],
  );

  if (productId == null) {
    return <div className={s.noticeBox}>{t("editor.variantNeedsCreate")}</div>;
  }

  return (
    <>
      <div className={s.variantCardHead}>
        <div>
          <h3 className={s.sectionTitle}>{t("editor.variantsTitle")}</h3>
          <div className={s.sectionHint}>{t("editor.variantsHint")}</div>
        </div>
        <div className={s.headerActions}>
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setRows((prev) => [...prev, newVariantRow(prev.length)])}
          >
            <Plus size={14} aria-hidden /> {t("editor.variantsAdd")}
          </Button>
          <Button type="button" size="sm" loading={saving} onClick={() => void save()}>
            {t("editor.variantsSave")}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="dashboard-loader" />
      ) : rows.length === 0 ? (
        <div className={s.sectionHint}>{t("editor.variantsEmpty")}</div>
      ) : (
        rows.map((row, index) => {
          const locked = row.id !== undefined && !row.sourceVariantId;
          return (
            <div key={row.id ?? row.sourceVariantId ?? index} className={s.variantCard}>
              <div className={s.variantCardHead}>
                <div className={s.specBadges}>
                  {row.id !== undefined && <Badge>#{row.id}</Badge>}
                  <Badge tone={row.active ? "success" : "neutral"}>
                    {row.active ? t("editor.variantActive") : t("categories.disabled")}
                  </Badge>
                </div>
                <label className={s.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={row.active}
                    disabled={locked}
                    onChange={(e) => patch(index, { active: e.target.checked })}
                  />
                  {t("editor.variantActive")}
                </label>
              </div>
              {locked && <div className={s.lockedNote}>{t("editor.variantsLocked")}</div>}
              <div className={s.variantGrid}>
                <Field label={t("editor.variantLabelEn")}>
                  <Input
                    value={row.labelEn}
                    disabled={locked}
                    onChange={(e) => patch(index, { labelEn: e.target.value })}
                  />
                </Field>
                <Field label={t("editor.variantLabelAr")}>
                  <Input
                    value={row.labelAr}
                    dir="rtl"
                    disabled={locked}
                    onChange={(e) => patch(index, { labelAr: e.target.value })}
                  />
                </Field>
                <Field label={t("editor.variantSku")}>
                  <Input
                    value={row.sku}
                    disabled={locked}
                    onChange={(e) => patch(index, { sku: e.target.value })}
                  />
                </Field>
                <Field label={t("editor.variantPrice")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={row.priceOverride}
                    disabled={locked}
                    onChange={(e) => patch(index, { priceOverride: e.target.value })}
                  />
                </Field>
                <Field label={t("editor.variantOldPrice")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={row.oldPrice}
                    disabled={locked}
                    onChange={(e) => patch(index, { oldPrice: e.target.value })}
                  />
                </Field>
                <Field label={t("editor.variantQty")}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={row.quantity}
                    disabled={locked}
                    onChange={(e) => patch(index, { quantity: e.target.value })}
                  />
                </Field>
              </div>
              <div className={s.variantGrid}>
                {row.options.map((opt, oi) => (
                  <div key={oi} className={s.grid2}>
                    <Field label={t("editor.variantOptName", { n: oi + 1 })}>
                      <Input
                        value={opt.name}
                        disabled={locked}
                        onChange={(e) => patchOption(index, oi, "name", e.target.value)}
                      />
                    </Field>
                    <Field label={t("editor.variantOptValue", { n: oi + 1 })}>
                      <Input
                        value={opt.value}
                        disabled={locked}
                        onChange={(e) => patchOption(index, oi, "value", e.target.value)}
                      />
                    </Field>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </>
  );
});
