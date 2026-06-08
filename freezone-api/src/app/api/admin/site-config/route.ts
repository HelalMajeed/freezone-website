import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

/**
 * Slim accessor for the top-level SiteConfig row.
 *
 * Distinct from `/api/admin/cms` (which serves the full homepage CMS payload
 * with all related entities) and `/api/admin/theme` (theme tokens only).
 * This endpoint manages brand, contact, payment, shipping, promo, SEO and the
 * maintenance flag — the fields a typical "Site settings" page exposes.
 */

const FIELDS = [
  "storeNameEn",
  "storeNameAr",
  "taglineEn",
  "taglineAr",
  "logoUrl",
  "headerLogoHeightPx",
  "phone",
  "whatsapp",
  "email",
  "addressEn",
  "addressAr",
  "zainCashWallet",
  "qiCardMerchantId",
  "freeDeliveryThreshold",
  "standardShippingFee",
  "promoBarTextEn",
  "promoBarTextAr",
  "promoBarEnabled",
  "maintenanceMode",
  "metaTitleEn",
  "metaTitleAr",
  "metaDescriptionEn",
  "metaDescriptionAr",
  "seoKeywords",
  "updatedAt",
] as const;

type SiteConfigField = (typeof FIELDS)[number];

type SelectShape = { [K in SiteConfigField]: true };

const SELECT: SelectShape = FIELDS.reduce(
  (acc, field) => {
    acc[field] = true;
    return acc;
  },
  {} as SelectShape,
);

export async function GET(req: Request) {
  const auth = await guardAdminRead(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { id: 1 },
      select: SELECT,
    });
    if (!row) {
      return Response.json(
        { error: "SiteConfig missing — run prisma db seed" },
        { status: 500 },
      );
    }
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function PATCH(req: Request) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") {
    return Response.json({ error: "body required" }, { status: 400 });
  }

  const stringFields: SiteConfigField[] = [
    "storeNameEn",
    "storeNameAr",
    "taglineEn",
    "taglineAr",
    "logoUrl",
    "phone",
    "whatsapp",
    "email",
    "addressEn",
    "addressAr",
    "zainCashWallet",
    "qiCardMerchantId",
    "promoBarTextEn",
    "promoBarTextAr",
    "metaTitleEn",
    "metaTitleAr",
    "metaDescriptionEn",
    "metaDescriptionAr",
    "seoKeywords",
  ];

  const intFields: SiteConfigField[] = [
    "headerLogoHeightPx",
    "freeDeliveryThreshold",
    "standardShippingFee",
  ];

  const boolFields: SiteConfigField[] = ["promoBarEnabled", "maintenanceMode"];

  const data: Record<string, string | number | boolean | null> = {};

  for (const field of stringFields) {
    if (field in body) {
      const v = body[field];
      if (v === null) data[field] = null;
      else if (typeof v === "string") data[field] = v;
      else
        return Response.json({ error: `${field} must be a string` }, { status: 400 });
    }
  }

  for (const field of intFields) {
    if (field in body) {
      const v = body[field];
      if (typeof v === "number" && Number.isFinite(v)) data[field] = Math.round(v);
      else
        return Response.json({ error: `${field} must be a number` }, { status: 400 });
    }
  }

  for (const field of boolFields) {
    if (field in body) {
      const v = body[field];
      if (typeof v === "boolean") data[field] = v;
      else
        return Response.json({ error: `${field} must be a boolean` }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "no editable fields supplied" }, { status: 400 });
  }

  try {
    const updated = await prisma.siteConfig.update({
      where: { id: 1 },
      data,
      select: SELECT,
    });
    revalidateStorefrontData();
    await logAdminAction("siteConfig.update", "SiteConfig", { ...auditContext(auth.actor, req),
      entityId: 1,
      payload: { fields: Object.keys(data) },
    });
    return Response.json(updated);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
