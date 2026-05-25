export type AdminProductImage = { url: string; sortOrder: number };

export type AdminProductRow = {
  id: number;
  categoryId: number;
  /** Extra category ids (primary is `categoryId`). */
  secondaryCategoryIds?: number[];
  nameEn: string;
  nameAr: string;
  descEn: string;
  descAr: string;
  price: number;
  oldPrice: number | null;
  brand: string;
  sku?: string;
  model?: string;
  quantity: number;
  inStock: boolean;
  featured: boolean;
  isNew: boolean;
  rating: number;
  reviews: number;
  sales: number;
  published: boolean;
  catalogStatus?: string;
  createdAt: string;
  updatedAt?: string;
  icon: string;
  category: { slug: string; nameEn: string; nameAr: string };
  images: AdminProductImage[];
  brandRef: { nameEn: string; nameAr: string } | null;
};

export function adminProductInCategory(p: AdminProductRow, categoryId: number): boolean {
  if (p.categoryId === categoryId) return true;
  return Boolean(p.secondaryCategoryIds?.includes(categoryId));
}

export function formatIqd(n: number): string {
  return `${n.toLocaleString("ar-IQ")} د.ع`;
}

export function parseAdminProductsFromApi(raw: unknown): AdminProductRow[] {
  if (!Array.isArray(raw)) return [];
  const out: AdminProductRow[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    if (!Number.isFinite(id)) continue;
    const cat = o.category;
    const category =
      cat && typeof cat === "object"
        ? {
            slug: String((cat as Record<string, unknown>).slug ?? ""),
            nameEn: String((cat as Record<string, unknown>).nameEn ?? ""),
            nameAr: String((cat as Record<string, unknown>).nameAr ?? ""),
          }
        : { slug: "", nameEn: "", nameAr: "" };
    const br = o.brandRef;
    const brandRef =
      br && typeof br === "object"
        ? {
            nameEn: String((br as Record<string, unknown>).nameEn ?? ""),
            nameAr: String((br as Record<string, unknown>).nameAr ?? ""),
          }
        : null;
    const imgsRaw = o.images;
    const images: AdminProductImage[] = [];
    if (Array.isArray(imgsRaw)) {
      for (const im of imgsRaw) {
        if (!im || typeof im !== "object") continue;
        const ir = im as Record<string, unknown>;
        const url = typeof ir.url === "string" ? ir.url : "";
        if (!url) continue;
        const sortOrder = typeof ir.sortOrder === "number" ? ir.sortOrder : Number(ir.sortOrder) || 0;
        images.push({ url, sortOrder });
      }
      images.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    const createdAt =
      typeof o.createdAt === "string"
        ? o.createdAt
        : o.createdAt instanceof Date
          ? o.createdAt.toISOString()
          : "";
    const updatedAt =
      typeof o.updatedAt === "string"
        ? o.updatedAt
        : o.updatedAt instanceof Date
          ? o.updatedAt.toISOString()
          : undefined;
    const secRaw = o.secondaryCategories;
    let secondaryCategoryIds: number[] | undefined;
    if (Array.isArray(secRaw)) {
      secondaryCategoryIds = secRaw
        .map((x) => {
          if (!x || typeof x !== "object") return NaN;
          const id = (x as Record<string, unknown>).categoryId;
          return typeof id === "number" ? id : Number(id);
        })
        .filter((n) => Number.isFinite(n));
      if (secondaryCategoryIds.length === 0) secondaryCategoryIds = undefined;
    }
    out.push({
      id,
      categoryId: typeof o.categoryId === "number" ? o.categoryId : Number(o.categoryId) || 0,
      ...(secondaryCategoryIds?.length ? { secondaryCategoryIds } : {}),
      nameEn: String(o.nameEn ?? ""),
      nameAr: String(o.nameAr ?? ""),
      descEn: String(o.descEn ?? ""),
      descAr: String(o.descAr ?? ""),
      price: typeof o.price === "number" ? o.price : Number(o.price) || 0,
      oldPrice: o.oldPrice == null ? null : typeof o.oldPrice === "number" ? o.oldPrice : Number(o.oldPrice) || null,
      brand: String(o.brand ?? ""),
      sku: typeof o.sku === "string" ? o.sku : undefined,
      model: typeof o.model === "string" ? o.model : undefined,
      quantity: typeof o.quantity === "number" ? o.quantity : Number(o.quantity) || 0,
      inStock: Boolean(o.inStock),
      featured: Boolean(o.featured),
      isNew: Boolean(o.isNew),
      rating: typeof o.rating === "number" ? o.rating : Number(o.rating) || 0,
      reviews: typeof o.reviews === "number" ? o.reviews : Number(o.reviews) || 0,
      sales: typeof o.sales === "number" ? o.sales : Number(o.sales) || 0,
      published: o.published !== false,
      catalogStatus: typeof o.catalogStatus === "string" ? o.catalogStatus : undefined,
      createdAt,
      ...(updatedAt ? { updatedAt } : {}),
      icon: String(o.icon ?? "📦"),
      category,
      images,
      brandRef,
    });
  }
  return out;
}

export function brandLabel(p: AdminProductRow): string {
  if (p.brandRef?.nameAr?.trim()) return p.brandRef.nameAr.trim();
  if (p.brandRef?.nameEn?.trim()) return p.brandRef.nameEn.trim();
  const b = p.brand?.trim();
  if (b && b !== "—") return b;
  return "";
}

export function excerpt(text: string, max = 110): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}
