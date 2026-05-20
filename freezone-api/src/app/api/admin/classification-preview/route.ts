import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { buildLaptopFilterRepairFromEav } from "@/lib/admin-filter-repair";

export async function GET(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ dbConnected: false, previews: [], summary: { wouldChange: 0, total: 0 } });
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get("categorySlug") ?? "laptops";
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));

  const category = await prisma.category.findFirst({
    where: { slug },
    select: { id: true, slug: true, nameEn: true },
  });
  if (!category) {
    return Response.json({ error: `Category not found: ${slug}` }, { status: 404 });
  }

  const products = await prisma.product.findMany({
    where: { categoryId: category.id },
    select: { id: true },
    orderBy: { id: "asc" },
    take: limit,
  });

  const previews: {
    productId: number;
    ok: boolean;
    changed: boolean;
    before: Record<string, string | null>;
    after: Record<string, string | null>;
    reason?: string;
  }[] = [];

  let wouldChange = 0;

  for (const p of products) {
    const built = await buildLaptopFilterRepairFromEav(prisma, {
      id: p.id,
      categoryId: category.id,
    });
    if (!built.ok) {
      previews.push({
        productId: p.id,
        ok: false,
        changed: false,
        before: {},
        after: {},
        reason: built.reason,
      });
      continue;
    }
    if (built.changed) wouldChange++;
    previews.push({
      productId: p.id,
      ok: true,
      changed: built.changed,
      before: built.before as Record<string, string | null>,
      after: built.after as Record<string, string | null>,
    });
  }

  return Response.json({
    dbConnected: true,
    category: { id: category.id, slug: category.slug, name: category.nameEn },
    dryRunOnly: true,
    manualCommand: `flyctl ssh console -a freezone-website -C "sh -lc 'cd /app && npx tsx scripts/repair-laptop-filter-values.ts --dry-run'"`,
    applyCommand: `flyctl ssh console -a freezone-website -C "sh -lc 'cd /app && npx tsx scripts/repair-laptop-filter-values.ts'"`,
    summary: { wouldChange, total: products.length, scanned: previews.length },
    previews,
  });
}
