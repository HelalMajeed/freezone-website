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

export function facetDefsToCategoryAttributeCreates(
  categoryId: number,
  attrs: FacetAttributeDef[],
): Prisma.CategoryAttributeCreateManyInput[] {
  return attrs.map((a, i) => {
    const preset = defaultAttributeMetaForKey(a.key);
    const type = a.type ?? preset.type ?? "SELECT";
    return {
      categoryId,
      key: normalizeAttributeKey(a.key),
      nameEn: a.name_en,
      nameAr: a.name_ar,
      type,
      options: (a.options ?? preset.options) as Prisma.InputJsonValue | undefined,
      filterable: a.filterable ?? preset.filterable ?? true,
      searchable: a.searchable ?? preset.searchable ?? false,
      comparable: a.comparable ?? preset.comparable ?? false,
      displayGroup: a.displayGroup ?? preset.displayGroup ?? "specs",
      sortOrder: i,
      required: a.required ?? preset.required ?? false,
      unit: a.unit ?? preset.unit ?? null,
    };
  });
}

/** Upsert normalized rows from facet JSON (admin save / seed). */
export async function syncCategoryAttributesFromFacetKeys(
  prisma: PrismaLike,
  categoryId: number,
  facetKeys: unknown,
): Promise<CategoryAttributeRow[]> {
  const attrs = parseFacetAttributesFromUnknown(facetKeys);
  await prisma.categoryAttribute.deleteMany({ where: { categoryId } });
  if (attrs.length) {
    await prisma.categoryAttribute.createMany({
      data: facetDefsToCategoryAttributeCreates(categoryId, attrs),
    });
  }
  const facetJson = attrs.length ? (attrs as unknown as Prisma.InputJsonValue) : undefined;
  if (facetJson !== undefined) {
    await prisma.category.update({
      where: { id: categoryId },
      data: { facetKeys: facetJson },
    });
  }
  return prisma.categoryAttribute.findMany({
    where: { categoryId },
    orderBy: { sortOrder: "asc" },
  });
}

/** Build facet JSON from normalized rows (keeps legacy column in sync). */
export function facetKeysJsonFromCategoryAttributes(rows: CategoryAttributeRow[]): FacetAttributeDef[] {
  return categoryAttributeRowsToFacetDefs(rows);
}

export function legacyFacetKeysFromRows(rows: CategoryAttributeRow[]): string[] {
  return facetKeysFromAttributes(categoryAttributeRowsToFacetDefs(rows));
}
