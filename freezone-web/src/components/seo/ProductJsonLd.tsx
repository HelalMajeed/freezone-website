import type { Product } from "@/lib/data";
import { canonicalSitePath, publicSiteBaseUrl } from "./Seo";
import { safeJsonLd } from "./jsonLd";

/** schema.org Product structured data for the product detail page. */
export function ProductJsonLd({ product, locale }: { product: Product; locale: "en" | "ar" }) {
  const base = publicSiteBaseUrl();
  const url = `${base}${canonicalSitePath(`/${locale}/product/${product.id}`)}`;
  const images = (product.images ?? [])
    .filter(Boolean)
    .map((img) => (img.startsWith("http") ? img : `${base}${img.startsWith("/") ? img : `/${img}`}`));

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.desc,
    ...(images.length ? { image: images } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(product.model ? { model: product.model } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    offers: {
      "@type": "Offer",
      url,
      price: product.price,
      priceCurrency: "IQD",
      availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(product.reviews > 0 && product.rating > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating.toFixed(1),
            reviewCount: product.reviews,
          },
        }
      : {}),
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(data) }} />;
}
