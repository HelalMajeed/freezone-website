import { getProductsCatalog } from "@/lib/catalog";

export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const products = await getProductsCatalog(locale);
  return Response.json(products);
}
