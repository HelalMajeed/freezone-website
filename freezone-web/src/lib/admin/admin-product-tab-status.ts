import type { FacetAttributeDef } from "@/lib/data";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { normalizeFilterValue } from "@/lib/classification/filter-value";
import type { ProductEditorTab } from "@/components/admin/products/AdminProductEditorTabs";

export type TabCompletion = "complete" | "warn" | "error" | "idle";

export type ProductEditorContext = {
  nameEn: string;
  categoryId: number;
  price: number;
  quantity: number;
  inStock: boolean;
  published: boolean;
  imageCount: number;
  displaySpecs: Record<string, string>;
  filterSpecs: Record<string, string>;
  attributes: FacetAttributeDef[];
};

export function stockWorkflowStatus(inStock: boolean, quantity: number): "in" | "out" | "unset" {
  if (!inStock) return "out";
  if (quantity <= 0) return "unset";
  return "in";
}

export function computeTabStatuses(ctx: ProductEditorContext): Record<ProductEditorTab, TabCompletion> {
  const { filterableSpecs } = partitionFacetAttributes(ctx.attributes);
  const requiredFilters = filterableSpecs.filter((a) => a.required);
  const missingFilters = requiredFilters.filter((a) => !(ctx.filterSpecs[a.key] ?? "").trim());
  const hasAnyFilter = filterableSpecs.some((a) => (ctx.filterSpecs[a.key] ?? "").trim());
  const hasDisplay = ctx.attributes.some((a) => !a.filterable && (ctx.displaySpecs[a.key] ?? "").trim());

  const basicOk = Boolean(ctx.nameEn.trim() && ctx.categoryId);
  const pricingOk = ctx.price > 0;
  const imagesOk = ctx.imageCount > 0;
  const filtersOk = filterableSpecs.length === 0 || (missingFilters.length === 0 && hasAnyFilter);
  const displayOk = ctx.attributes.length === 0 || hasDisplay;

  const previewOk = basicOk && pricingOk && imagesOk && filtersOk;

  return {
    basic: basicOk ? "complete" : "warn",
    pricing: pricingOk ? (stockWorkflowStatus(ctx.inStock, ctx.quantity) === "unset" ? "warn" : "complete") : "warn",
    images: imagesOk ? "complete" : "warn",
    filters: ctx.attributes.length === 0 ? "idle" : filtersOk ? "complete" : missingFilters.length ? "error" : "warn",
    display: ctx.attributes.length === 0 ? "idle" : displayOk ? "complete" : "warn",
    preview: previewOk ? "complete" : "warn",
  };
}

export function deriveWorkflowStatus(ctx: ProductEditorContext): import("@/components/admin/ui/AdminStatusBadge").ProductWorkflowStatus {
  if (!ctx.published && !ctx.nameEn.trim()) return "disabled";
  const tabs = computeTabStatuses(ctx);
  const hasIssue = Object.values(tabs).some((t) => t === "error" || t === "warn");
  if (!ctx.published) return hasIssue ? "missing" : "ready";
  return hasIssue ? "missing" : "published";
}

export function proposeFiltersFromDisplay(
  attributes: FacetAttributeDef[],
  displaySpecs: Record<string, string>,
  currentFilters: Record<string, string>,
): Record<string, string> {
  const { filterableSpecs } = partitionFacetAttributes(attributes);
  const next = { ...currentFilters };
  for (const attr of filterableSpecs) {
    const altFull = attr.key.endsWith("_model")
      ? `${attr.key.replace(/_model$/, "")}_full`
      : attr.key.endsWith("_family")
        ? `${attr.key.replace(/_family$/, "")}_full`
        : null;
    const display = (
      displaySpecs[attr.key] ??
      (altFull ? displaySpecs[altFull] : "") ??
      displaySpecs[`${attr.key}_full`] ??
      ""
    ).trim();
    if (!display) continue;
    const derived = normalizeFilterValue(attr.key, display);
    if (derived) next[attr.key] = derived;
  }
  return next;
}
