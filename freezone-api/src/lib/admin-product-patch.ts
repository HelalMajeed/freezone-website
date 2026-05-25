import { z } from "zod";
import type { ProductAvailability, ProductCatalogStatus } from "@prisma/client";

const catalogStatus = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PUBLISHED",
  "ARCHIVED",
]);
const availability = z.enum(["IN_STOCK", "OUT_OF_STOCK", "COMING_SOON", "ON_DEMAND"]);

export const adminProductPatchSchema = z
  .object({
    categoryId: z.number().int().positive().optional(),
    brand: z.string().optional(),
    brandId: z.number().int().positive().nullable().optional(),
    sku: z.string().max(120).optional(),
    model: z.string().max(200).optional(),
    quantity: z.number().int().min(0).optional(),
    slug: z.string().max(220).nullable().optional(),
    nameEn: z.string().min(1).max(200).optional(),
    nameAr: z.string().max(200).optional(),
    shortDescEn: z.string().max(200).optional(),
    shortDescAr: z.string().max(200).optional(),
    descEn: z.string().max(100_000).optional(),
    descAr: z.string().max(100_000).optional(),
    keyFeatures: z.array(z.string().max(200)).max(30).optional(),
    whatsInBox: z.array(z.string().max(200)).max(30).optional(),
    catalogStatus: catalogStatus.optional(),
    availability: availability.optional(),
    price: z.number().int().min(0).optional(),
    priceUsd: z.number().min(0).nullable().optional(),
    costPrice: z.number().int().min(0).nullable().optional(),
    salePrice: z.number().int().min(0).nullable().optional(),
    saleStartAt: z.string().datetime().nullable().optional(),
    saleEndAt: z.string().datetime().nullable().optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
    prepTimeDays: z.number().int().min(0).optional(),
    metaTitleEn: z.string().max(70).nullable().optional(),
    metaTitleAr: z.string().max(70).nullable().optional(),
    metaDescEn: z.string().max(170).nullable().optional(),
    metaDescAr: z.string().max(170).nullable().optional(),
    seoKeywords: z.array(z.string().max(80)).max(30).optional(),
    weightKg: z.number().min(0).nullable().optional(),
    dimLengthCm: z.number().min(0).nullable().optional(),
    dimWidthCm: z.number().min(0).nullable().optional(),
    dimHeightCm: z.number().min(0).nullable().optional(),
    requiresSpecialHandling: z.boolean().optional(),
    excludedProvinces: z.array(z.string().max(80)).max(50).optional(),
    internalNotes: z.string().max(5000).nullable().optional(),
    sourceSupplier: z.string().max(200).nullable().optional(),
    purchaseInvoiceRef: z.string().max(200).nullable().optional(),
    reviewNotes: z.string().max(2000).nullable().optional(),
    oldPrice: z.number().int().min(0).nullable().optional(),
    originalPrice: z.number().int().min(0).nullable().optional(),
    warranty: z.string().max(500).optional(),
    sourceUrl: z.string().max(2000).nullable().optional(),
    storage: z.string().max(200).optional(),
    model3d: z.string().max(500).nullable().optional(),
    specs: z.record(z.string(), z.unknown()).nullable().optional(),
    inStock: z.boolean().optional(),
    featured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    icon: z.string().max(20).optional(),
    rating: z.number().min(0).max(5).optional(),
    reviews: z.number().int().min(0).optional(),
    sales: z.number().int().min(0).optional(),
    published: z.boolean().optional(),
    secondaryCategoryIds: z.array(z.number().int().positive()).nullable().optional(),
    submitForReview: z.boolean().optional(),
  })
  .strict();

export type AdminProductPatchBody = z.infer<typeof adminProductPatchSchema>;

export function parseAdminProductPatch(
  raw: unknown,
): { ok: true; data: AdminProductPatchBody } | { ok: false; error: string } {
  const parsed = adminProductPatchSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "بيانات غير صالحة" };
  }
  return { ok: true, data: parsed.data };
}

export type ProductPatchPrismaData = {
  catalogStatus?: ProductCatalogStatus;
  published?: boolean;
  submittedAt?: Date | null;
  [key: string]: unknown;
};
