export type CategoryFlat = {
  id: string;
  parentId: string | null;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  attributeIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryTreeNode = CategoryFlat & { children: CategoryTreeNode[] };

export type AttributeRow = {
  id: string;
  key: string;
  nameEn: string;
  nameAr: string;
  type: string;
  options: unknown;
  sortOrder: number;
  active: boolean;
};
