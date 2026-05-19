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
  valueString: string | null;
  valueNumber: number | null;
  valueBoolean: boolean | null;
  valueJson: unknown;
};
