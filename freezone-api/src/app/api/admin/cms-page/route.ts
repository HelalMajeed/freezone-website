import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { handleRouteDbError } from "@/lib/db-route-error";

export async function GET(req: Request) {
  const auth = await guardAdminRead(req);
  if (!auth.ok) return auth.response;
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug") ?? "home";

  try {
    let page = await prisma.cmsPage.findUnique({
      where: { slug },
      include: { sections: { orderBy: { sortOrder: "asc" } } },
    });

    if (!page) {
      page = await prisma.cmsPage.create({
        data: { slug, labelAr: "الصفحة الرئيسية", labelEn: "Homepage" },
        include: { sections: { orderBy: { sortOrder: "asc" } } },
      });
    }

    return Response.json(page);
  } catch (e) {
    return handleRouteDbError(e);
  }
}
