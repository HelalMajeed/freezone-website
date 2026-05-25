import { prisma } from "@/lib/prisma";
import { ACTIVE_PRODUCT_WHERE } from "@/lib/admin-product-scope";

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

export async function runAdminSearch(q: string, limit = 15): Promise<AdminSearchResult> {
  const s = q.trim();
  if (!s) {
    return { products: [], categories: [], brands: [], users: [] };
  }
  const take = Math.min(30, Math.max(5, limit));
  const idNum = /^\d+$/.test(s) ? parseInt(s, 10) : null;

  const [products, categories, brands, users] = await Promise.all([
    prisma.product.findMany({
      where: {
        ...ACTIVE_PRODUCT_WHERE,
        OR: [
          { nameEn: { contains: s, mode: "insensitive" } },
          { nameAr: { contains: s, mode: "insensitive" } },
          { sku: { contains: s, mode: "insensitive" } },
          { slug: { contains: s, mode: "insensitive" } },
          ...(idNum != null ? [{ id: idNum }] : []),
        ],
      },
      take,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        sku: true,
        slug: true,
        catalogStatus: true,
      },
    }),
    prisma.category.findMany({
      where: {
        OR: [
          { nameEn: { contains: s, mode: "insensitive" } },
          { nameAr: { contains: s, mode: "insensitive" } },
          { slug: { contains: s, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, nameAr: true, nameEn: true, slug: true },
    }),
    prisma.brand.findMany({
      where: {
        OR: [
          { nameEn: { contains: s, mode: "insensitive" } },
          { nameAr: { contains: s, mode: "insensitive" } },
          { slug: { contains: s, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, nameAr: true, nameEn: true, slug: true },
    }),
    prisma.adminUser.findMany({
      where: {
        active: true,
        OR: [
          { name: { contains: s, mode: "insensitive" } },
          { email: { contains: s, mode: "insensitive" } },
        ],
      },
      take,
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  return { products, categories, brands, users };
}
