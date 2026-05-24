// Ensure every spec key that the importer is about to write has a matching
// `CategoryAttribute` row in the target category. Any key without one would be
// rejected by `validateProductSpecsAgainstCategory`.
//
// New attributes are minted as `type: "TEXT"`, `filterable: false`,
// `searchable: false` so they cannot accidentally pollute the public storefront
// filter UI. An admin can later promote them to filterable from the category
// editor.

import { prisma as defaultPrisma } from "@/lib/prisma";

/** Minimal Prisma-shaped surface — keeps tests trivial to fake. */
export interface AttributeStore {
  categoryAttribute: {
    findMany: (args: { where: { categoryId: number }; select?: Record<string, true> }) => Promise<Array<{ key: string }>>;
    createMany: (args: { data: Array<NewAttributeInput>; skipDuplicates?: boolean }) => Promise<{ count: number }>;
    aggregate: (args: { where: { categoryId: number }; _max: { sortOrder: true } }) => Promise<{ _max: { sortOrder: number | null } }>;
  };
}

interface NewAttributeInput {
  categoryId: number;
  key: string;
  nameEn: string;
  nameAr: string;
  type: string;
  filterable: boolean;
  searchable: boolean;
  comparable: boolean;
  displayGroup: string;
  sortOrder: number;
  required: boolean;
}

export interface EnsureAttributesResult {
  /** Keys that already had a CategoryAttribute and were left untouched. */
  reused: string[];
  /** Keys that were newly created. */
  created: string[];
}

/**
 * Idempotent. Pass the keys you intend to persist on `Product.specs`; any
 * missing ones are added to the category's schema. Safe to call on every
 * import — the duplicates filter at the DB layer guarantees no row growth on
 * re-runs.
 */
export async function ensureCategoryAttributes(
  categoryId: number,
  specKeys: Iterable<string>,
  store: AttributeStore = defaultPrisma as unknown as AttributeStore,
): Promise<EnsureAttributesResult> {
  /** Deduplicate, drop empties, and snake_case the key so it never trips the
   *  validator's `/^[a-z][a-z0-9_]*$/` schema check (a camelCase or kebab-case
   *  attribute key poisons the whole category's validation). */
  const cleanKeys = Array.from(
    new Set([...specKeys].map((k) => snakeCaseAttributeKey(k ?? "")).filter(Boolean)),
  );
  if (cleanKeys.length === 0) return { reused: [], created: [] };

  const existing = await store.categoryAttribute.findMany({
    where: { categoryId },
    select: { key: true },
  });
  const have = new Set(existing.map((e) => e.key));
  const reused: string[] = [];
  const missing: string[] = [];
  for (const k of cleanKeys) {
    if (have.has(k)) reused.push(k);
    else missing.push(k);
  }
  if (missing.length === 0) return { reused, created: [] };

  const sortAgg = await store.categoryAttribute.aggregate({
    where: { categoryId },
    _max: { sortOrder: true },
  });
  /** Push new keys after every existing one so the admin UI ordering is stable. */
  const startOrder = (sortAgg._max.sortOrder ?? -1) + 1;
  const data: NewAttributeInput[] = missing.map((key, idx) => ({
    categoryId,
    key,
    nameEn: humanize(key),
    nameAr: humanize(key),
    type: "TEXT",
    filterable: false,
    searchable: false,
    comparable: false,
    displayGroup: "specs",
    sortOrder: startOrder + idx,
    required: false,
  }));
  /** `skipDuplicates` covers a race where another worker created the row
   *  between findMany and createMany. */
  await store.categoryAttribute.createMany({ data, skipDuplicates: true });
  return { reused, created: missing };
}

/** Normalize an arbitrary spec key into the snake_case form the validator
 *  accepts: lowercase letters, digits, underscores; must start with a letter. */
export function snakeCaseAttributeKey(input: string): string {
  let s = input
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!s) return "";
  if (!/^[a-z]/.test(s)) s = `k_${s}`;
  return s.slice(0, 40);
}

/** Convert snake_case_key → "Snake Case Key" for display. Pure helper. */
export function humanize(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(^|\s)([a-z])/g, (_match, sep: string, ch: string) => sep + ch.toUpperCase());
}
