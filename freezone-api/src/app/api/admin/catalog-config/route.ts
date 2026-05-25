import { catalogExchangeRate } from "@/lib/catalog-config";
import { guardAdminRead } from "@/lib/admin-route-guard";

export async function GET(req: Request): Promise<Response> {
  const readGuard = await guardAdminRead(req);
  if (!readGuard.ok) return readGuard.response;
  return Response.json({
    ok: true,
    data: { exchangeRateIqdPerUsd: catalogExchangeRate(), defaultLocale: "ar-IQ", defaultCurrency: "IQD" },
  });
}
