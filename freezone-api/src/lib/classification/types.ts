/** Attribute types per Universal Product Classification Framework (FRAMEWORK.md §E). */
export const ATTRIBUTE_TYPES = [
  "SELECT",
  "MULTI_SELECT",
  "RANGE",
  "BOOLEAN",
  "TEXT",
  "COLOR",
] as const;

export type AttributeType = (typeof ATTRIBUTE_TYPES)[number];

export function isAttributeType(v: string): v is AttributeType {
  return (ATTRIBUTE_TYPES as readonly string[]).includes(v);
}

export type CategoryAttributeRow = {
  id: number;
  categoryId: number;
  key: string;
  nameEn: string;
  nameAr: string;
  type: string;
  options: unknown;
  filterable: boolean;
  searchable: boolean;
  comparable: boolean;
  displayGroup: string;
  sortOrder: number;
  required: boolean;
  unit: string | null;
  active?: boolean;
};

export type ProductAttributeValueRow = {
  attributeKey: string;
  /** Full text on product detail page */
  displayValue?: string | null;
  /** Normalized short token for category/search filters (alias: normalizedValue) */
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
};

/** Normalized filter facet — stored in `valueString`. */
export function normalizedValueFromRow(row: ProductAttributeValueRow): string | null {
  return row.valueString?.trim() || null;
}
