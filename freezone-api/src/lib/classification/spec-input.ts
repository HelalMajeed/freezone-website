/** Admin / API product spec field: display text + optional normalized filter value. */
export type SpecValueInput = {
  display: string;
  filter?: string;
};

export function isSpecValueObject(v: unknown): v is SpecValueInput {
  return (
    v != null &&
    typeof v === "object" &&
    !Array.isArray(v) &&
    "display" in v &&
    typeof (v as SpecValueInput).display === "string"
  );
}

/** Parse request body specs: plain strings or `{ display, filter? }` per key. */
export function parseSpecsPayload(raw: unknown): Record<string, string | SpecValueInput> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string | SpecValueInput> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isSpecValueObject(v)) {
      const display = v.display.trim();
      const filter = v.filter?.trim();
      if (display || filter) {
        out[k] = { display, ...(filter ? { filter } : {}) };
      }
      continue;
    }
    if (typeof v === "string") {
      const s = v.trim();
      if (s) out[k] = s;
    } else if (v != null && typeof v !== "object") {
      const s = String(v).trim();
      if (s) out[k] = s;
    }
  }
  return out;
}

export function specInputDisplay(raw: string | SpecValueInput): string {
  return typeof raw === "string" ? raw.trim() : raw.display.trim();
}

export function specInputFilter(raw: string | SpecValueInput): string | undefined {
  if (typeof raw === "string") return undefined;
  const f = raw.filter?.trim();
  return f || undefined;
}
