/** Build API specs body: display text + optional normalized filter value per attribute. */
export function buildSpecsPayloadForSave(
  attributes: { key: string; filterable?: boolean }[],
  displaySpecs: Record<string, string>,
  filterSpecs: Record<string, string>,
): Record<string, string | { display: string; filter?: string }> {
  const out: Record<string, string | { display: string; filter?: string }> = {};
  for (const attr of attributes) {
    const display = (displaySpecs[attr.key] ?? "").trim();
    const filter = (filterSpecs[attr.key] ?? "").trim();
    if (!display && !filter) continue;
    if (attr.filterable) {
      out[attr.key] = { display, ...(filter ? { filter } : {}) };
    } else if (display) {
      out[attr.key] = display;
    }
  }
  return out;
}
