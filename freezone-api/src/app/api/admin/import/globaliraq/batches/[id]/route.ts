import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }
  const id = (await ctx.params).id;
  if (!id) return Response.json({ error: "bad id" }, { status: 400 });

  try {
    const batch = await prisma.importBatch.findUnique({ where: { id } });
    if (!batch) return Response.json({ error: "not found" }, { status: 404 });

    /** Pull every product this batch wrote so the admin UI can deep-link straight to edit pages. */
    const products = await prisma.product.findMany({
      where: { importBatchId: id },
      orderBy: { id: "asc" },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        sourceUrl: true,
        sourceHandle: true,
        sourcePrice: true,
        price: true,
        oldPrice: true,
        warranty: true,
        published: true,
        importedAt: true,
        _count: { select: { images: true, variants: true } },
      },
    });

    return Response.json({ batch, products });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
