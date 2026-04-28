import { getCachedSiteTheme } from "@/lib/site-theme";

export async function GET() {
  const tokens = await getCachedSiteTheme();
  return Response.json(tokens);
}
