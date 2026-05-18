import type { AttributeType } from "@/lib/data";

/** Match product spec value against URL filter selection (RANGE / BOOLEAN / MULTI_SELECT). */
export function productValueMatchesFilterSelection(
  displayValue: string | undefined,
  type: AttributeType | undefined,
  selected: string[],
): boolean {
  if (!selected.length) return true;
  if (!displayValue?.trim()) return false;
  const t = type ?? "SELECT";

  if (t === "BOOLEAN") {
    const v = displayValue.trim().toLowerCase();
    return selected.some((s) => {
      const want = s.trim().toLowerCase();
      if (want === "true") return v === "true" || v === "yes" || v === "1" || v === "نعم";
      if (want === "false") return v === "false" || v === "no" || v === "0" || v === "لا";
      return v === want;
    });
  }

  if (t === "RANGE") {
    const num = parseFloat(displayValue.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(num)) return false;
    for (const sel of selected) {
      const m = sel.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
      if (m) {
        const min = parseFloat(m[1]);
        const max = parseFloat(m[2]);
        if (num >= min && num <= max) return true;
        continue;
      }
      const exact = parseFloat(sel);
      if (Number.isFinite(exact) && num === exact) return true;
    }
    return false;
  }

  if (t === "MULTI_SELECT") {
    const parts = displayValue.split(/[,;|]/).map((x) => x.trim());
    return selected.some((s) => parts.includes(s.trim()));
  }

  return selected.includes(displayValue.trim());
}
