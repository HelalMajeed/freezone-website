import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { actorForAudit } from "@/lib/admin-auth";
import { handleRouteDbError } from "@/lib/db-route-error";
import { logAdminAction } from "@/lib/admin-audit";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { mapCsvRowToProduct, parseProductsCsv } from "@/lib/csv-products-import";

const MAX_ROWS = 500;

export async function POST(req: Request): Promise<Response> {
  const mutate = await guardAdminMutate(req);
  if (!mutate.ok) return mutate.response;
  const audit = auditContext(mutate.actor, req);
  if (!isDatabaseConfigured()) {
    return Response.json({ ok: false, error: "لا توجد قاعدة بيانات" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { csv?: string; dryRun?: boolean } | null;
  const csv = body?.csv?.trim();
  if (!csv) {
    return Response.json({ ok: false, error: "محتوى CSV مطلوب", code: "MISSING_CSV" }, { status: 400 });
  }

  const { rows: rawRows } = parseProductsCsv(csv);
  if (!rawRows.length) {
    return Response.json({ ok: false, error: "لا توجد صفوف بيانات", code: "EMPTY" }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return Response.json({ ok: false, error: `الحد الأقصى ${MAX_ROWS} صف`, code: "TOO_MANY" }, { status: 400 });
  }

  const createdById = mutate.actor.kind === "dashboard" ? mutate.actor.user.id : null;
  const results: Array<{ row: number; ok: boolean; productId?: number; error?: string }> = [];

  try {
    const batch = await prisma.importBatch.create({
      data: {
        source: "csv-products",
        status: body?.dryRun ? "dry_run" : "running",
        total: rawRows.length,
        lockOwner: `api:${process.pid}`,
      },
    });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < rawRows.length; i++) {
      const mapped = mapCsvRowToProduct(rawRows[i]);
      if ("error" in mapped) {
        failed++;
        results.push({ row: i + 2, ok: false, error: mapped.error });
        continue;
      }

      if (body?.dryRun) {
        const cat = await prisma.category.findUnique({ where: { id: mapped.categoryId }, select: { id: true } });
        if (!cat) {
          failed++;
          results.push({ row: i + 2, ok: false, error: "قسم غير موجود" });
          continue;
        }
        succeeded++;
        results.push({ row: i + 2, ok: true });
        continue;
      }

      try {
        /** Create the product and its opening-stock ledger row atomically so a
         *  ledger failure rolls back the product (no orphan rows on a failed
         *  per-row result). */
        const product = await prisma.$transaction(async (tx) => {
          const created = await tx.product.create({
            data: {
              categoryId: mapped.categoryId,
              sku: mapped.sku,
              nameAr: mapped.nameAr,
              nameEn: mapped.nameEn,
              brand: mapped.brand,
              price: mapped.price,
              quantity: mapped.quantity,
              inStock: mapped.quantity > 0,
              descAr: mapped.descAr ?? "",
              descEn: mapped.descEn ?? "",
              catalogStatus: "DRAFT",
              published: false,
              importBatchId: batch.id,
              createdById,
            },
          });
          /** Inventory ledger: opening stock from the CSV import (contract (k)). */
          if (created.quantity > 0) {
            const actor = actorForAudit(mutate.actor);
            await tx.stockMovement.create({
              data: {
                productId: created.id,
                delta: created.quantity,
                reason: "import",
                qtyBefore: 0,
                qtyAfter: created.quantity,
                userId: actor.userId,
                userEmail: actor.userEmail,
                note: `importBatch:${batch.id}`,
              },
            });
          }
          return created;
        });
        succeeded++;
        results.push({ row: i + 2, ok: true, productId: product.id });
      } catch (e) {
        failed++;
        results.push({
          row: i + 2,
          ok: false,
          error: e instanceof Error ? e.message : "فشل الإنشاء",
        });
      }
    }

    if (!body?.dryRun) {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: {
          status: failed === rawRows.length ? "failed" : "completed",
          finishedAt: new Date(),
          succeeded,
          failed,
          results: results as unknown as object,
        },
      });
      revalidateStorefrontData();
      await logAdminAction("import.csv_products", "ImportBatch", {
        entityId: batch.id,
        payload: { succeeded, failed, total: rawRows.length },
        ...audit,
      });
    } else {
      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: "dry_run", finishedAt: new Date(), succeeded, failed, results: results as unknown as object },
      });
    }

    return Response.json({
      ok: true,
      data: { batchId: batch.id, dryRun: Boolean(body?.dryRun), succeeded, failed, results },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
