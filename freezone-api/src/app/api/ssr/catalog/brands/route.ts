import { getBrandsCatalog } from "@/lib/catalog";

export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const brands = await getBrandsCatalog(locale);
  return Response.json(brands);
}
