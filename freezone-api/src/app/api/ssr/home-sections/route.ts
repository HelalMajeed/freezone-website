import { getPublishedHomeSections } from "@/lib/cms-page-storefront";

export async function GET() {
  const sections = await getPublishedHomeSections();
  return Response.json(sections);
}
