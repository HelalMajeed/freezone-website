export function parseOptionsJson(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.map((x) => String(x).trim()).filter(Boolean);
  return out.length ? out : undefined;
}

export function normalizeAttributeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u0600-\u06FF-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
