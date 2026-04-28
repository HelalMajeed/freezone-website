import { getPublicSite } from "@/lib/site-public";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const locale = searchParams.get("locale") === "ar" ? "ar" : "en";
  const site = await getPublicSite(locale);
  return Response.json(site);
}
