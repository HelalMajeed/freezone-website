import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { handleRouteDbError } from "@/lib/db-route-error";
import { loadCategoryAttributeSchema } from "@/lib/classification/persist";
import { categoryAttributeRowsToFacetDefs, syncCategoryAttributesFromFacetKeys } from "@/lib/classification/sync";
import { parseOptionsJson } from "@/lib/classification/values";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const categoryId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(categoryId)) {
    return Response.json({ error: "invalid id" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    attributeKey?: string;
    option?: string;
  } | null;

  const attributeKey = body?.attributeKey?.trim();
  const option = body?.option?.trim();
  if (!attributeKey || !option) {
    return Response.json({ error: "attributeKey and option required" }, { status: 400 });
  }

  try {
    const rows = await loadCategoryAttributeSchema(
      (args) => prisma.categoryAttribute.findMany(args),
      categoryId,
    );
    const attrs = categoryAttributeRowsToFacetDefs(rows);
    const attr = attrs.find((a) => a.key === attributeKey);
    if (!attr) {
      return Response.json({ error: "attribute not found" }, { status: 404 });
    }
    const type = (attr.type ?? "SELECT").toUpperCase();
    if (type !== "SELECT" && type !== "MULTI_SELECT" && type !== "COLOR") {
      return Response.json({ error: "attribute type does not support options" }, { status: 400 });
    }

    const current = parseOptionsJson(attr.options) ?? [];
    if (current.includes(option)) {
      return Response.json({ ok: true, options: current });
    }

    const next = attrs.map((a) =>
      a.key === attributeKey ? { ...a, options: [...current, option] } : a,
    );
    const updated = await syncCategoryAttributesFromFacetKeys(prisma, categoryId, next);
    const row = updated.find((r) => r.key === attributeKey);
    const options = parseOptionsJson(row?.options) ?? [...current, option];
    return Response.json({ ok: true, attributeKey, options });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
