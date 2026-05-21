import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { stockWorkflowStatus } from "@/lib/admin/admin-product-tab-status";

export function productQualityHints(p: AdminProductRow): string[] {
  const hints: string[] = [];
  if (!p.images?.length) hints.push("بدون صورة");
  if (!p.published) hints.push("غير منشور");
  if (stockWorkflowStatus(p.inStock, p.quantity ?? 0) === "unset") hints.push("مخزون غير محدد");
  return hints;
}

export function formatAdminDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}
