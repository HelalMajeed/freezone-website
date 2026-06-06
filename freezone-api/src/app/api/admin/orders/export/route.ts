import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { guardAdminRead } from "@/lib/admin-route-guard";
import { jsonError } from "@/lib/dashboard-guard";
import { handleRouteDbError } from "@/lib/db-route-error";
import { buildOrdersWhere, parseDateRangeParam } from "@/lib/admin-orders-query";

/** Hard cap per contract (d) — rows beyond the cap are dropped, newest first. */
const MAX_EXPORT_ROWS = 10_000;

/** Frozen column order — contract (d) in docs/API_CONTRACTS.md. */
const COLUMNS = [
  "orderNumber",
  "status",
  "fulfillment",
  "paymentMethod",
  "customerName",
  "customerPhone",
  "city",
  "addressLine",
  "itemCount",
  "subtotal",
  "shipping",
  "discountTotal",
  "total",
  "couponCode",
  "createdAt",
] as const;

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function yyyymmdd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** GET /api/admin/orders/export — CSV with the same filters as the list endpoint. */
export async function GET(req: Request): Promise<Response> {
  const g = await guardAdminRead(req);
  if (!g.ok) return g.response;
  if (!isDatabaseConfigured()) return jsonError(503, "NO_DATABASE");

  const { searchParams } = new URL(req.url);
  const where = buildOrdersWhere(searchParams);

  try {
    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: MAX_EXPORT_ROWS,
      include: { items: { select: { qty: true } } },
    });

    const lines: string[] = [COLUMNS.join(",")];
    for (const o of rows) {
      lines.push(
        [
          csvEscape(o.orderNumber),
          csvEscape(o.status),
          csvEscape(o.fulfillment),
          csvEscape(o.paymentMethod),
          csvEscape(o.customerName),
          csvEscape(o.customerPhone),
          csvEscape(o.city),
          csvEscape(o.addressLine),
          String(o.items.reduce((s, i) => s + i.qty, 0)),
          String(o.subtotal),
          String(o.shipping),
          String(o.discountTotal),
          String(o.total),
          csvEscape(o.couponCode),
          o.createdAt.toISOString(),
        ].join(","),
      );
    }

    /** Filename range: explicit from/to params when given, else the createdAt
     *  span of the exported rows, else today (empty result). */
    const fromParam = parseDateRangeParam(searchParams.get("from"), "from");
    const toParam = parseDateRangeParam(searchParams.get("to"), "to");
    const oldest = rows.length ? rows[rows.length - 1].createdAt : new Date();
    const newest = rows.length ? rows[0].createdAt : new Date();
    const fromLabel = yyyymmdd(fromParam ?? oldest);
    const toLabel = yyyymmdd(toParam ?? newest);

    /** UTF-8 BOM so Excel opens Arabic text correctly. */
    const csv = "\uFEFF" + lines.join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders-${fromLabel}-${toLabel}.csv"`,
      },
    });
  } catch (e) {
    return handleRouteDbError(e);
  }
}
