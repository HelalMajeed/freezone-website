import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function POST(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { slug?: string } | null;
  const slug = body?.slug ?? "home";

  try {
    const page = await prisma.cmsPage.findUnique({
      where: { slug },
      include: { sections: true },
    });
    if (!page) return Response.json({ error: "page not found" }, { status: 404 });

    const sections = page.sections as { id: number; draftPayload: unknown }[];
    await prisma.$transaction(
      sections.map((s) =>
        prisma.cmsPageSection.update({
          where: { id: s.id },
          data: { publishedPayload: s.draftPayload as Prisma.InputJsonValue },
        }),
      ),
    );

    revalidateStorefrontData();
    await logAdminAction("cmsPage.publish", "CmsPage", { payload: { slug } });
    return Response.json({ ok: true });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
