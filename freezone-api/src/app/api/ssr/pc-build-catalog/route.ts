import { getProductsCatalog } from "@/lib/catalog";

/**
 * PC-builder storefront catalog — TEMPORARY EXCEPTION (see Phase-1 notes).
 *
 * The PC builder needs a broad product set (every part-linked product + the
 * storage-tagged accessory components) to map static parts → purchasable
 * storefront products and to power the accessory pickers. Rather than ship the
 * full catalog to EVERY storefront visitor via storefront-bootstrap, this
 * endpoint serves the (60s-cached, lean) catalog ONLY when the wizard mounts on
 * /pc-build. Normal browsing/home/category/brand pages never load it.
 *
 * Follow-up: replace with a curated PC-part product feed so even /pc-build
 * stops loading the whole catalog.
 */
export async function GET(req: Request) {
  const locale = new URL(req.url).searchParams.get("locale") === "ar" ? "ar" : "en";
  const products = await getProductsCatalog(locale);
  return Response.json({ products });
}
