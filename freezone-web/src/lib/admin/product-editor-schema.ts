import { z } from "zod";

export const catalogStatusSchema = z.enum([
  "DRAFT",
  "PENDING_REVIEW",
  "CHANGES_REQUESTED",
  "PUBLISHED",
  "ARCHIVED",
]);

export const availabilitySchema = z.enum([
  "IN_STOCK",
  "OUT_OF_STOCK",
  "COMING_SOON",
  "ON_DEMAND",
]);

export const productEditorSchema = z.object({
  nameAr: z.string().min(1, "الاسم بالعربية مطلوب").max(200),
  nameEn: z.string().min(1, "الاسم بالإنجليزية مطلوب").max(200),
  slug: z.string().max(220).optional().nullable(),
  sku: z.string().max(120),
  categoryId: z.number().int().positive("اختر القسم الرئيسي"),
  secondaryCategoryIds: z.array(z.number().int().positive()),
  brandId: z.number().int().positive().nullable(),
  brand: z.string(),
  catalogStatus: catalogStatusSchema,
  shortDescAr: z.string().max(200),
  shortDescEn: z.string().max(200),
  descAr: z.string().max(100_000),
  descEn: z.string().max(100_000),
  keyFeatures: z.array(z.string().max(200)),
  whatsInBox: z.array(z.string().max(200)),
  price: z.number().int().min(0),
  priceUsd: z.number().min(0).nullable(),
  costPrice: z.number().int().min(0).nullable(),
  salePrice: z.number().int().min(0).nullable(),
  saleStartAt: z.string().nullable(),
  saleEndAt: z.string().nullable(),
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0),
  availability: availabilitySchema,
  prepTimeDays: z.number().int().min(0),
  specs: z.record(z.string(), z.string()),
  metaTitleAr: z.string().max(70).nullable(),
  metaTitleEn: z.string().max(70).nullable(),
  metaDescAr: z.string().max(170).nullable(),
  metaDescEn: z.string().max(170).nullable(),
  seoKeywords: z.array(z.string().max(80)),
  weightKg: z.number().min(0).nullable(),
  dimLengthCm: z.number().min(0).nullable(),
  dimWidthCm: z.number().min(0).nullable(),
  dimHeightCm: z.number().min(0).nullable(),
  requiresSpecialHandling: z.boolean(),
  excludedProvinces: z.array(z.string()),
  internalNotes: z.string().max(5000).nullable(),
  sourceSupplier: z.string().max(200).nullable(),
  purchaseInvoiceRef: z.string().max(200).nullable(),
  published: z.boolean(),
});

export type ProductEditorValues = z.infer<typeof productEditorSchema>;

export const draftSaveSchema = productEditorSchema.pick({
  nameAr: true,
  nameEn: true,
  categoryId: true,
});
