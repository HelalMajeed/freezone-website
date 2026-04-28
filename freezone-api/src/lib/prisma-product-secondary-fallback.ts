/**
 * True when `secondaryCategories` / join table cannot be used yet:
 * - Prisma client not regenerated after schema change ("Unknown field … secondaryCategories")
 * - Migration not applied (missing table / relation)
 */
export function productQueryMissingSecondarySupport(err: unknown): boolean {
  const m = err instanceof Error ? err.message : String(err);
  if (m.includes("secondaryCategories") && m.includes("Unknown field")) return true;
  if (m.includes("ProductSecondaryCategory") && (m.includes("does not exist") || m.includes("42P01"))) return true;
  if (m.toLowerCase().includes("productsecondarycategory") && m.includes("does not exist")) return true;
  return false;
}
