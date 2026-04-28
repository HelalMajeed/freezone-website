import { getHomeCms } from "@/lib/layout-cms";

export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const data = await getHomeCms(locale);
  return Response.json(data);
}
