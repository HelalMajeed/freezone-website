import { CATEGORY_TEMPLATES } from "@/data/category-templates";
import { guardAdminRead } from "@/lib/admin-route-guard";

export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  return Response.json({
    ok: true,
    data: CATEGORY_TEMPLATES.map((t) => ({
      id: t.id,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      attributeCount: t.attributes.length,
    })),
  });
}
