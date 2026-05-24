import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

/** Body shape for one variant — every column on ProductVariant the importer wants to set. */
type VariantInput = {
  sourceVariantId?: string | null;
  sku?: string;
  labelEn?: string;
  labelAr?: string;
  priceOverride?: number | null;
  oldPrice?: number | null;
  optionName1?: string | null;
  optionValue1?: string | null;
  optionName2?: string | null;
  optionValue2?: string | null;
  optionName3?: string | null;
  optionValue3?: string | null;
  imageUrl?: string | null;
  sourceRawJson?: unknown;
  quantity?: number;
  active?: boolean;
  sortOrder?: number;
};

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    const variants = await prisma.productVariant.findMany({
      where: { productId: id },
      orderBy: { sortOrder: "asc" },
    });
    return Response.json({ variants });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

/**
 * Upsert variants by (productId, sourceVariantId). Re-running the importer is
 * idempotent: existing variant rows for the same sourceVariantId are updated in
 * place, new ones are inserted, anything not in the payload is left alone (we
 * never delete variants from this endpoint — manual ops can do that later).
 *
 * Rejects variant.imageUrl values that point at external hosts so a tampered
 * payload can't leave us with cdn.shopify.com URLs in production data.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return Response.json({ error: "bad id" }, { status: 400 });

  const body = (await req.json().catch(() => null)) as { variants?: VariantInput[] } | null;
  const variants = Array.isArray(body?.variants) ? body!.variants : null;
  if (!variants) return Response.json({ error: "variants[] required" }, { status: 400 });

  for (const v of variants) {
    if (v.imageUrl && /^https?:\/\//i.test(v.imageUrl.trim())) {
      return Response.json(
        { error: "variant imageUrl must be a local /uploads/ path; import the image first" },
        { status: 400 },
      );
    }
  }

  try {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return Response.json({ error: "not found" }, { status: 404 });

    const out: Array<{ id: number; sourceVariantId: string | null; action: "created" | "updated" }> = [];
    for (const v of variants) {
      const baseData = {
        sku: (v.sku ?? "").trim(),
        labelEn: (v.labelEn ?? "").trim(),
        labelAr: (v.labelAr ?? v.labelEn ?? "").trim(),
        priceOverride: typeof v.priceOverride === "number" && Number.isFinite(v.priceOverride) ? Math.round(v.priceOverride) : null,
        oldPrice: typeof v.oldPrice === "number" && Number.isFinite(v.oldPrice) ? Math.round(v.oldPrice) : null,
        optionName1: v.optionName1?.trim() || null,
        optionValue1: v.optionValue1?.trim() || null,
        optionName2: v.optionName2?.trim() || null,
        optionValue2: v.optionValue2?.trim() || null,
        optionName3: v.optionName3?.trim() || null,
        optionValue3: v.optionValue3?.trim() || null,
        imageUrl: v.imageUrl?.trim() || null,
        sourceRawJson: v.sourceRawJson !== undefined ? (v.sourceRawJson as object) : undefined,
        quantity: typeof v.quantity === "number" && Number.isFinite(v.quantity) ? Math.max(0, Math.round(v.quantity)) : 0,
        active: v.active !== false,
        sortOrder: typeof v.sortOrder === "number" && Number.isFinite(v.sortOrder) ? v.sortOrder : 0,
      } satisfies Record<string, unknown>;

      if (v.sourceVariantId) {
        /** Look up first so we can report created vs updated for the audit log. */
        const existing = await prisma.productVariant.findFirst({
          where: { productId: id, sourceVariantId: v.sourceVariantId },
        });
        if (existing) {
          await prisma.productVariant.update({
            where: { id: existing.id },
            data: baseData,
          });
          out.push({ id: existing.id, sourceVariantId: v.sourceVariantId, action: "updated" });
        } else {
          const created = await prisma.productVariant.create({
            data: { ...baseData, productId: id, sourceVariantId: v.sourceVariantId },
          });
          out.push({ id: created.id, sourceVariantId: v.sourceVariantId, action: "created" });
        }
      } else {
        const created = await prisma.productVariant.create({
          data: { ...baseData, productId: id, sourceVariantId: null },
        });
        out.push({ id: created.id, sourceVariantId: null, action: "created" });
      }
    }

    revalidateStorefrontData();
    await logAdminAction("product.variants.upsert", "ProductVariant", {
      entityId: id,
      payload: { count: out.length },
    });
    return Response.json({ ok: true, variants: out });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
