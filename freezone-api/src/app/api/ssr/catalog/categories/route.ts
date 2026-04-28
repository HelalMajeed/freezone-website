import { getCategoriesCatalog } from "@/lib/catalog";

export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const categories = await getCategoriesCatalog(locale);
  return Response.json(categories);
}
