/**
 * Product editor — the "plain form" tabs (Basic, Pricing, Inventory, Content,
 * SEO, Shipping, Advanced). The interactive tabs (Specs, Variants, Images)
 * live in their own files.
 */
import { Field, Input, Select, Textarea } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import type { Brand, CategoryOption, ProductCatalogStatus, Role } from "@/lib/dashboard/api";
import type { ProductAvailability } from "@/lib/dashboard/api-extra";
import type { EditorForm, FieldErrors } from "./form";
import s from "./editor.module.css";

export type TabProps = {
  form: EditorForm;
  set: <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => void;
  errors: FieldErrors;
};

// ─── Basic ──────────────────────────────────────────────────────────────────

export function BasicTab({
  form,
  set,
  errors,
  categories,
  brands,
}: TabProps & { categories: CategoryOption[]; brands: Brand[] }) {
  const { t, lang } = useDashboardLocale();

  const categoryOptions = [
    { value: "", label: t("editor.pickCategory") },
    ...categories.map((c) => ({
      value: String(c.id),
      label: lang === "ar" ? c.nameAr || c.nameEn : c.nameEn,
    })),
  ];
  const brandOptions = [
    { value: "", label: t("editor.noBrand") },
    ...brands.map((b) => ({
      value: String(b.id),
      label: lang === "ar" ? b.nameAr || b.nameEn : b.nameEn,
    })),
  ];

  return (
    <>
      <div className={s.grid2}>
        <Field label={t("editor.nameEn")} required error={errors.nameEn}>
          <Input
            value={form.nameEn}
            invalid={Boolean(errors.nameEn)}
            onChange={(e) => set("nameEn", e.target.value)}
            placeholder="ROG Strix G16"
          />
        </Field>
        <Field label={t("editor.nameAr")} hint={t("common.optional")}>
          <Input
            value={form.nameAr}
            dir="rtl"
            onChange={(e) => set("nameAr", e.target.value)}
            placeholder="روج ستركس G16"
          />
        </Field>
      </div>
      <div className={s.grid2}>
        <Field label={t("editor.category")} required error={errors.categoryId}>
          <Select
            value={form.categoryId}
            invalid={Boolean(errors.categoryId)}
            onChange={(e) => set("categoryId", (e.target as HTMLSelectElement).value)}
            options={categoryOptions}
          />
        </Field>
        <Field label={t("editor.brand")}>
          <Select
            value={form.brandId}
            onChange={(e) => set("brandId", (e.target as HTMLSelectElement).value)}
            options={brandOptions}
          />
        </Field>
      </div>
      <div className={s.flagsRow}>
        <label className={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
          />
          {t("editor.published")}
        </label>
        <label className={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
          />
          {t("editor.featured")}
        </label>
        <label className={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.isNew}
            onChange={(e) => set("isNew", e.target.checked)}
          />
          {t("editor.isNew")}
        </label>
      </div>
    </>
  );
}

// ─── Pricing ────────────────────────────────────────────────────────────────

export function PricingTab({
  form,
  set,
  errors,
  showCostPrice,
}: TabProps & { showCostPrice: boolean }) {
  const { t } = useDashboardLocale();
  return (
    <>
      <div className={s.grid3}>
        <Field label={t("editor.price")} required error={errors.price}>
          <Input
            type="number"
            inputMode="numeric"
            invalid={Boolean(errors.price)}
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field label={t("editor.oldPrice")} hint={t("common.optional")} error={errors.oldPrice}>
          <Input
            type="number"
            inputMode="numeric"
            invalid={Boolean(errors.oldPrice)}
            value={form.oldPrice}
            onChange={(e) => set("oldPrice", e.target.value)}
          />
        </Field>
        <Field label={t("editor.priceUsd")} hint={t("common.optional")} error={errors.priceUsd}>
          <Input
            type="number"
            inputMode="decimal"
            invalid={Boolean(errors.priceUsd)}
            value={form.priceUsd}
            onChange={(e) => set("priceUsd", e.target.value)}
          />
        </Field>
      </div>
      <hr className={s.divider} />
      <div className={s.grid3}>
        <Field label={t("editor.salePrice")} hint={t("common.optional")} error={errors.salePrice}>
          <Input
            type="number"
            inputMode="numeric"
            invalid={Boolean(errors.salePrice)}
            value={form.salePrice}
            onChange={(e) => set("salePrice", e.target.value)}
          />
        </Field>
        <Field label={t("editor.saleStartAt")} hint={t("editor.saleHint")}>
          <Input
            type="datetime-local"
            value={form.saleStartAt}
            onChange={(e) => set("saleStartAt", e.target.value)}
          />
        </Field>
        <Field label={t("editor.saleEndAt")} error={errors.saleEndAt}>
          <Input
            type="datetime-local"
            invalid={Boolean(errors.saleEndAt)}
            value={form.saleEndAt}
            onChange={(e) => set("saleEndAt", e.target.value)}
          />
        </Field>
      </div>
      {showCostPrice && (
        <>
          <hr className={s.divider} />
          <div className={s.grid3}>
            <Field
              label={t("editor.costPrice")}
              hint={t("common.optional")}
              error={errors.costPrice}
            >
              <Input
                type="number"
                inputMode="numeric"
                invalid={Boolean(errors.costPrice)}
                value={form.costPrice}
                onChange={(e) => set("costPrice", e.target.value)}
              />
            </Field>
          </div>
        </>
      )}
    </>
  );
}

// ─── Inventory ──────────────────────────────────────────────────────────────

const AVAILABILITY_VALUES: ProductAvailability[] = [
  "IN_STOCK",
  "OUT_OF_STOCK",
  "COMING_SOON",
  "ON_DEMAND",
];

export function InventoryTab({ form, set, errors }: TabProps) {
  const { t } = useDashboardLocale();
  const availabilityOptions = AVAILABILITY_VALUES.map((v) => ({
    value: v,
    label: t(`editor.avail${v}`),
  }));
  return (
    <>
      <div className={s.grid3}>
        <Field label={t("editor.quantity")} error={errors.quantity}>
          <Input
            type="number"
            inputMode="numeric"
            invalid={Boolean(errors.quantity)}
            value={form.quantity}
            onChange={(e) => set("quantity", e.target.value)}
          />
        </Field>
        <Field label={t("editor.lowStockThreshold")} error={errors.lowStockThreshold}>
          <Input
            type="number"
            inputMode="numeric"
            invalid={Boolean(errors.lowStockThreshold)}
            value={form.lowStockThreshold}
            onChange={(e) => set("lowStockThreshold", e.target.value)}
          />
        </Field>
        <Field label={t("editor.availability")}>
          <Select
            value={form.availability}
            onChange={(e) =>
              set("availability", (e.target as HTMLSelectElement).value as ProductAvailability)
            }
            options={availabilityOptions}
          />
        </Field>
      </div>
      <div className={s.grid2}>
        <Field label={t("editor.sku")}>
          <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} />
        </Field>
        <Field label={t("editor.model")}>
          <Input value={form.model} onChange={(e) => set("model", e.target.value)} />
        </Field>
      </div>
    </>
  );
}

// ─── Content ────────────────────────────────────────────────────────────────

export function ContentTab({ form, set }: TabProps) {
  const { t } = useDashboardLocale();
  return (
    <>
      <div className={s.grid2}>
        <Field label={t("editor.shortDescEn")}>
          <Textarea
            rows={2}
            maxLength={200}
            value={form.shortDescEn}
            onChange={(e) => set("shortDescEn", e.target.value)}
          />
        </Field>
        <Field label={t("editor.shortDescAr")}>
          <Textarea
            rows={2}
            maxLength={200}
            dir="rtl"
            value={form.shortDescAr}
            onChange={(e) => set("shortDescAr", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("editor.descEn")}>
        <Textarea rows={5} value={form.descEn} onChange={(e) => set("descEn", e.target.value)} />
      </Field>
      <Field label={t("editor.descAr")}>
        <Textarea
          rows={5}
          dir="rtl"
          value={form.descAr}
          onChange={(e) => set("descAr", e.target.value)}
        />
      </Field>
      <div className={s.grid2}>
        <Field label={t("editor.keyFeatures")} hint={t("editor.keyFeaturesHint")}>
          <Textarea
            rows={5}
            value={form.keyFeatures}
            onChange={(e) => set("keyFeatures", e.target.value)}
          />
        </Field>
        <Field label={t("editor.whatsInBox")} hint={t("editor.whatsInBoxHint")}>
          <Textarea
            rows={5}
            value={form.whatsInBox}
            onChange={(e) => set("whatsInBox", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("editor.warranty")}>
        <Input value={form.warranty} onChange={(e) => set("warranty", e.target.value)} />
      </Field>
    </>
  );
}

// ─── SEO ────────────────────────────────────────────────────────────────────

export function SeoTab({ form, set }: TabProps) {
  const { t } = useDashboardLocale();
  return (
    <>
      <div className={s.grid2}>
        <Field label={t("editor.metaTitleEn")}>
          <Input
            maxLength={70}
            value={form.metaTitleEn}
            onChange={(e) => set("metaTitleEn", e.target.value)}
          />
        </Field>
        <Field label={t("editor.metaTitleAr")}>
          <Input
            maxLength={70}
            dir="rtl"
            value={form.metaTitleAr}
            onChange={(e) => set("metaTitleAr", e.target.value)}
          />
        </Field>
      </div>
      <div className={s.grid2}>
        <Field label={t("editor.metaDescEn")}>
          <Textarea
            rows={3}
            maxLength={170}
            value={form.metaDescEn}
            onChange={(e) => set("metaDescEn", e.target.value)}
          />
        </Field>
        <Field label={t("editor.metaDescAr")}>
          <Textarea
            rows={3}
            maxLength={170}
            dir="rtl"
            value={form.metaDescAr}
            onChange={(e) => set("metaDescAr", e.target.value)}
          />
        </Field>
      </div>
      <Field label={t("editor.seoKeywords")} hint={t("editor.seoKeywordsHint")}>
        <Input
          value={form.seoKeywords}
          onChange={(e) => set("seoKeywords", e.target.value)}
          placeholder="laptop, gaming, asus"
        />
      </Field>
      <Field label={t("editor.slug")} hint={t("editor.slugHint")}>
        <Input
          value={form.slug}
          onChange={(e) => set("slug", e.target.value)}
          placeholder="rog-strix-g16"
        />
      </Field>
    </>
  );
}

// ─── Shipping ───────────────────────────────────────────────────────────────

export function ShippingTab({ form, set, errors }: TabProps) {
  const { t } = useDashboardLocale();
  return (
    <>
      <div className={s.grid4}>
        <Field label={t("editor.weightKg")} error={errors.weightKg}>
          <Input
            type="number"
            inputMode="decimal"
            invalid={Boolean(errors.weightKg)}
            value={form.weightKg}
            onChange={(e) => set("weightKg", e.target.value)}
          />
        </Field>
        <Field label={t("editor.dimLengthCm")} error={errors.dimLengthCm}>
          <Input
            type="number"
            inputMode="decimal"
            invalid={Boolean(errors.dimLengthCm)}
            value={form.dimLengthCm}
            onChange={(e) => set("dimLengthCm", e.target.value)}
          />
        </Field>
        <Field label={t("editor.dimWidthCm")} error={errors.dimWidthCm}>
          <Input
            type="number"
            inputMode="decimal"
            invalid={Boolean(errors.dimWidthCm)}
            value={form.dimWidthCm}
            onChange={(e) => set("dimWidthCm", e.target.value)}
          />
        </Field>
        <Field label={t("editor.dimHeightCm")} error={errors.dimHeightCm}>
          <Input
            type="number"
            inputMode="decimal"
            invalid={Boolean(errors.dimHeightCm)}
            value={form.dimHeightCm}
            onChange={(e) => set("dimHeightCm", e.target.value)}
          />
        </Field>
      </div>
      <div className={s.flagsRow}>
        <label className={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={form.requiresSpecialHandling}
            onChange={(e) => set("requiresSpecialHandling", e.target.checked)}
          />
          {t("editor.specialHandling")}
        </label>
      </div>
      <Field label={t("editor.excludedProvinces")} hint={t("editor.excludedProvincesHint")}>
        <Textarea
          rows={4}
          value={form.excludedProvinces}
          onChange={(e) => set("excludedProvinces", e.target.value)}
        />
      </Field>
    </>
  );
}

// ─── Advanced ───────────────────────────────────────────────────────────────

/** Mirrors `canTransitionCatalogStatus` in the API (product-workflow.ts). */
const STATUS_TRANSITIONS: Record<
  ProductCatalogStatus,
  Partial<Record<ProductCatalogStatus, Role[]>>
> = {
  DRAFT: {
    PENDING_REVIEW: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  PENDING_REVIEW: {
    DRAFT: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    CHANGES_REQUESTED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["SUPER_ADMIN"],
  },
  CHANGES_REQUESTED: {
    DRAFT: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    PENDING_REVIEW: ["CATALOG_EDITOR", "CATALOG_MANAGER", "SUPER_ADMIN"],
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  PUBLISHED: {
    ARCHIVED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    DRAFT: ["SUPER_ADMIN"],
    PENDING_REVIEW: ["SUPER_ADMIN"],
    CHANGES_REQUESTED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
  },
  ARCHIVED: {
    DRAFT: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    PUBLISHED: ["CATALOG_MANAGER", "SUPER_ADMIN"],
    PENDING_REVIEW: ["SUPER_ADMIN"],
  },
};

function allowedStatuses(
  current: ProductCatalogStatus,
  role: Role | null,
): ProductCatalogStatus[] {
  if (role === "SUPER_ADMIN") {
    return ["DRAFT", "PENDING_REVIEW", "CHANGES_REQUESTED", "PUBLISHED", "ARCHIVED"];
  }
  const targets = Object.entries(STATUS_TRANSITIONS[current] ?? {})
    .filter(([, roles]) => (role ? roles?.includes(role) : false))
    .map(([status]) => status as ProductCatalogStatus);
  return [current, ...targets];
}

export function AdvancedTab({
  form,
  set,
  categories,
  baselineStatus,
  role,
  reviewNotes,
}: TabProps & {
  categories: CategoryOption[];
  /** Status loaded from the server (transition source). */
  baselineStatus: ProductCatalogStatus;
  role: Role | null;
  reviewNotes: string | null;
}) {
  const { t, lang } = useDashboardLocale();

  const statuses = allowedStatuses(baselineStatus, role);
  const statusOptions = statuses.map((v) => ({
    value: v,
    label: t(`products.status${v}`),
  }));

  const primaryId = form.categoryId ? parseInt(form.categoryId, 10) : null;
  const secondaryCandidates = categories.filter((c) => c.id !== primaryId);

  const toggleSecondary = (id: number) => {
    const next = form.secondaryCategoryIds.includes(id)
      ? form.secondaryCategoryIds.filter((x) => x !== id)
      : [...form.secondaryCategoryIds, id];
    set("secondaryCategoryIds", next);
  };

  return (
    <>
      {reviewNotes?.trim() ? (
        <div className={s.reviewNotesBox}>
          <strong>{t("editor.reviewNotes")}:</strong> {reviewNotes}
        </div>
      ) : null}
      <div className={s.grid2}>
        <Field label={t("editor.catalogStatus")}>
          <Select
            value={form.catalogStatus}
            onChange={(e) =>
              set("catalogStatus", (e.target as HTMLSelectElement).value as ProductCatalogStatus)
            }
            options={statusOptions}
          />
        </Field>
        <Field label={t("editor.model3d")} hint={t("common.optional")}>
          <Input
            value={form.model3d}
            onChange={(e) => set("model3d", e.target.value)}
            placeholder="/uploads/models/product.glb"
          />
        </Field>
      </div>
      <Field
        label={t("editor.secondaryCategories")}
        hint={t("editor.secondaryCategoriesHint")}
      >
        <div className={s.chipsGrid}>
          {secondaryCandidates.map((c) => (
            <label key={c.id} className={s.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.secondaryCategoryIds.includes(c.id)}
                onChange={() => toggleSecondary(c.id)}
              />
              {lang === "ar" ? c.nameAr || c.nameEn : c.nameEn}
            </label>
          ))}
        </div>
      </Field>
      <Field label={t("editor.internalNotes")} hint={t("editor.internalNotesHint")}>
        <Textarea
          rows={4}
          maxLength={5000}
          value={form.internalNotes}
          onChange={(e) => set("internalNotes", e.target.value)}
        />
      </Field>
    </>
  );
}
