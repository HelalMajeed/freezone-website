import { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { mergeThemeTokens } from "@/lib/theme-tokens";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ tokens: mergeThemeTokens(null) });
  }
  try {
    const cfg = await prisma.siteConfig.findUnique({ where: { id: 1 }, select: { themeTokens: true } });
    return Response.json({ tokens: mergeThemeTokens(cfg?.themeTokens) });
  } catch (e) {
    return handleRouteDbError(e);
  }
}

export async function PATCH(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { tokens?: Record<string, unknown> } | null;
  if (!body?.tokens || typeof body.tokens !== "object") {
    return Response.json({ error: "tokens object required" }, { status: 400 });
  }

  const merged = mergeThemeTokens(body.tokens);
  try {
    await prisma.siteConfig.update({
      where: { id: 1 },
      data: { themeTokens: merged as unknown as Prisma.InputJsonValue },
    });
    revalidateStorefrontData();
    await logAdminAction("theme.update", "SiteConfig", { entityId: 1 });
    return Response.json({ ok: true, tokens: merged });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
