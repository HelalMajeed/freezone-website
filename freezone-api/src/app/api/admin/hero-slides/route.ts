import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead, guardAdminMutate, auditContext } from "@/lib/admin-route-guard";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request) {
  const auth = await guardAdminRead(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  try {
    const rows = await prisma.heroSlide.findMany({ orderBy: { sortOrder: "asc" } });
    return Response.json(rows);
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function POST(req: Request) {
  const auth = await guardAdminMutate(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as {
    badgeEn?: string;
    badgeAr?: string;
    titleLine1En?: string;
    titleLine1Ar?: string;
    titleLine2En?: string;
    titleLine2Ar?: string;
    descEn?: string;
    descAr?: string;
    imageUrl?: string;
    primaryLabelEn?: string;
    primaryLabelAr?: string;
    primaryHref?: string;
    secondaryLabelEn?: string;
    secondaryLabelAr?: string;
    secondaryHref?: string;
    active?: boolean;
    sortOrder?: number;
  } | null;

  const imageUrl = body?.imageUrl?.trim();
  if (!imageUrl) {
    return Response.json({ error: "imageUrl required" }, { status: 400 });
  }

  try {
    const row = await prisma.heroSlide.create({
      data: {
        layoutMode: "structured",
        badgeEn: body?.badgeEn ?? "",
        badgeAr: body?.badgeAr ?? "",
        titleLine1En: body?.titleLine1En ?? "",
        titleLine1Ar: body?.titleLine1Ar ?? "",
        titleLine2En: body?.titleLine2En ?? "",
        titleLine2Ar: body?.titleLine2Ar ?? "",
        descEn: body?.descEn ?? "",
        descAr: body?.descAr ?? "",
        imageUrl,
        primaryLabelEn: body?.primaryLabelEn ?? "",
        primaryLabelAr: body?.primaryLabelAr ?? "",
        primaryHref: body?.primaryHref?.trim() || "/products",
        secondaryLabelEn: body?.secondaryLabelEn ?? "",
        secondaryLabelAr: body?.secondaryLabelAr ?? "",
        secondaryHref: body?.secondaryHref?.trim() || "/contact",
        active: body?.active !== false,
        sortOrder: typeof body?.sortOrder === "number" ? body.sortOrder : 0,
      },
    });
    revalidateStorefrontData();
    await logAdminAction("heroSlide.create", "HeroSlide", { ...auditContext(auth.actor, req), entityId: row.id });
    return Response.json(row);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
