import type { Prisma } from "@prisma/client";
import type { FacetAttributeDef } from "@/lib/data";
import { parseFacetAttributesFromUnknown, facetKeysFromAttributes } from "@/lib/facet-attributes";
import { defaultAttributeMetaForKey } from "./presets";
import { normalizeAttributeKey, normalizeAttributeType, parseOptionsJson } from "./values";
import type { CategoryAttributeRow } from "./types";

type PrismaLike = {
  categoryAttribute: {
    deleteMany: (args: { where: { categoryId: number } }) => Promise<unknown>;
    createMany: (args: { data: Prisma.CategoryAttributeCreateManyInput[] }) => Promise<unknown>;
    findMany: (args: {
      where: { categoryId: number };
      orderBy: { sortOrder: "asc" };
    }) => Promise<CategoryAttributeRow[]>;
  };
  category: {
    update: (args: {
      where: { id: number };
      data: { facetKeys?: Prisma.InputJsonValue | typeof Prisma.JsonNull };
    }) => Promise<unknown>;
  };
};

export function categoryAttributeRowsToFacetDefs(rows: CategoryAttributeRow[]): FacetAttributeDef[] {
  return rows.map((r) => ({
    key: r.key,
    name_en: r.nameEn,
    name_ar: r.nameAr,
    type: normalizeAttributeType(r.type),
    options: parseOptionsJson(r.options),
    filterable: r.filterable,
    searchable: r.searchable,
    comparable: r.comparable,
    displayGroup: r.displayGroup,
    required: r.required,
    unit: r.unit ?? undefined,
  }));
}

export function facetDefToCategoryAttributeData(
  categoryId: number,
  a: FacetAttributeDef,
  sortOrder: number,
): Prisma.CategoryAttributeCreateManyInput {
  const preset = defaultAttributeMetaForKey(a.key);
  const type = a.type ?? preset.type ?? "SELECT";
  return {
    categoryId,
    key: normalizeAttributeKey(a.key),
    nameEn: a.name_en,
    nameAr: a.name_ar,
    type,
    options: (a.options ?? preset.options) as Prisma.InputJsonValue | undefined,
    filterable: a.filterable === true,
    searchable: a.searchable ?? preset.searchable ?? false,
    comparable: a.comparable ?? preset.comparable ?? false,
    displayGroup: a.displayGroup ?? preset.displayGroup ?? "specs",
    sortOrder,
    required: a.required ?? preset.required ?? false,
    unit: a.unit ?? preset.unit ?? null,
    active: true,
  };
}

export function facetDefsToCategoryAttributeCreates(
  categoryId: number,
  attrs: FacetAttributeDef[],
): Prisma.CategoryAttributeCreateManyInput[] {
  return attrs.map((a, i) => facetDefToCategoryAttributeData(categoryId, a, i));
}

type UpsertPrisma = PrismaLike & {
  categoryAttribute: PrismaLike["categoryAttribute"] & {
    upsert: (args: {
      where: { categoryId_key: { categoryId: number; key: string } };
      create: Prisma.CategoryAttributeCreateManyInput;
      update: Omit<Prisma.CategoryAttributeCreateManyInput, "categoryId" | "key">;
    }) => Promise<unknown>;
  };
};

/** Upsert attributes from facet JSON (seed / admin). Does not delete products or ProductAttributeValue. */
export async function syncCategoryAttributesFromFacetKeys(
  prisma: PrismaLike,
  categoryId: number,
  facetKeys: unknown,
): Promise<CategoryAttributeRow[]> {
  const attrs = parseFacetAttributesFromUnknown(facetKeys);
  const db = prisma as UpsertPrisma;

  for (let i = 0; i < attrs.length; i++) {
    const data = facetDefToCategoryAttributeData(categoryId, attrs[i], i);
    const { categoryId: cid, key, ...update } = data;
    await db.categoryAttribute.upsert({
      where: { categoryId_key: { categoryId: cid, key } },
      create: data,
      update,
    });
  }

  const rows = await prisma.categoryAttribute.findMany({
    where: { categoryId },
    orderBy: { sortOrder: "asc" },
  });
  const facetJson = categoryAttributeRowsToFacetDefs(rows) as unknown as Prisma.InputJsonValue;
  await prisma.category.update({
    where: { id: categoryId },
    data: { facetKeys: facetJson },
  });
  return rows;
}

/** Build facet JSON from normalized rows (keeps legacy column in sync). */
export function facetKeysJsonFromCategoryAttributes(rows: CategoryAttributeRow[]): FacetAttributeDef[] {
  return categoryAttributeRowsToFacetDefs(rows);
}

export function legacyFacetKeysFromRows(rows: CategoryAttributeRow[]): string[] {
  return facetKeysFromAttributes(categoryAttributeRowsToFacetDefs(rows));
}
