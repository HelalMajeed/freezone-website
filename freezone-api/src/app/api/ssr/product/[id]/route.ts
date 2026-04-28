import { getProductById } from "@/lib/catalog";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) {
    return Response.json({ error: "bad id" }, { status: 400 });
  }
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const product = await getProductById(id, locale);
  return Response.json(product);
}
