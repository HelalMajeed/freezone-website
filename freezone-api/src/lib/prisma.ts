import { Prisma, PrismaClient } from "@prisma/client";

/** تجمع الاتصالات: أضف إلى `DATABASE_URL` مثل `?connection_limit=10&pool_timeout=20` (خاصةً مع Neon/Supabase). */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/** يحدّ من انتظار TCP عند سقوط Postgres (بدون ذلك قد يطول الاستعلام عشرات الثواني). */
function withPostgresConnectTimeout(url: string, seconds: number): string {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("connect_timeout")) {
      u.searchParams.set("connect_timeout", String(seconds));
    }
    return u.toString();
  } catch {
    return url;
  }
}

function resolveDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return undefined;
  const sec = Number(process.env.PG_CONNECT_TIMEOUT_SECONDS);
  const timeout = Number.isFinite(sec) && sec > 0 ? sec : 5;
  return withPostgresConnectTimeout(raw, timeout);
}

const resolvedDatasourceUrl = resolveDatasourceUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    ...(resolvedDatasourceUrl ? { datasources: { db: { url: resolvedDatasourceUrl } } } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/** `STATIC_STOREFRONT_ONLY=true` → كتالوج/واجهة من `data.ts` دون اتصال بـ Postgres */
export function isDatabaseConfigured(): boolean {
  if (process.env.STATIC_STOREFRONT_ONLY === "true") return false;
  return Boolean(process.env.DATABASE_URL?.trim());
}

/** لعرض رسائل إدارة دقيقة دون كشف أسرار الاتصال */
export type DatabaseBlockReason = "none" | "static_only" | "no_database_url";

export function getDatabaseBlockReason(): DatabaseBlockReason {
  if (process.env.STATIC_STOREFRONT_ONLY === "true") return "static_only";
  if (!process.env.DATABASE_URL?.trim()) return "no_database_url";
  return "none";
}

export function isDbConnectionError(e: unknown): boolean {
  if (e instanceof Prisma.PrismaClientInitializationError) return true;
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P1001") return true;
  return e instanceof Error && e.message.includes("Can't reach database");
}
