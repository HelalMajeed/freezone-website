export type AdminSearchResult = {
  products: Array<{
    id: number;
    nameAr: string;
    nameEn: string;
    sku: string;
    slug: string | null;
    catalogStatus: string;
  }>;
  categories: Array<{ id: number; nameAr: string; nameEn: string; slug: string }>;
  brands: Array<{ id: number; nameAr: string; nameEn: string; slug: string }>;
  users: Array<{ id: number; name: string; email: string; role: string }>;
};
