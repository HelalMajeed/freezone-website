import type { Product } from "@/lib/data";

/**
 * Schema.org Product structured data + Open Graph / Twitter meta for a PDP.
 *
 * This is client-injected (the storefront is a Vite SPA). Google renders JS so
 * it reads both the JSON-LD and the meta tags. Non-JS scrapers (older WhatsApp/
 * Facebook crawlers) won't execute this — full coverage would need SSR or
 * Netlify prerendering, tracked as a follow-up.
 */
export function ProductJsonLd({
  product,
  locale,
  baseUrl,
}: {
  product: Product;
  locale: "en" | "ar";
  baseUrl: string;
}) {
  const url = `${baseUrl}/${locale}/product/${product.id}`;
  const image = (product.images ?? [])
    .filter(Boolean)
    .map((src) => (src.startsWith("http") ? src : `${baseUrl}${src}`));
  const inStock = product.inStock !== false;

  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.name,
    description: (product.desc || product.name).slice(0, 500),
    image: image.length ? image : undefined,
    sku: product.sku || undefined,
    mpn: product.model || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "IQD",
      price: String(product.price),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      ...(product.oldPrice && product.oldPrice > product.price
        ? { priceSpecification: { "@type": "PriceSpecification", price: String(product.oldPrice), priceCurrency: "IQD" } }
        : {}),
    },
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: String(product.rating),
            reviewCount: String(Math.max(1, product.reviews ?? 1)),
          },
        }
      : {}),
  };

  const ogTitle = product.name;
  const ogDesc = (product.desc || product.name).slice(0, 200);
  const ogImage = image[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      <ProductMeta
        url={url}
        title={ogTitle}
        description={ogDesc}
        image={ogImage}
        price={product.price}
        locale={locale}
      />
    </>
  );
}

/**
 * Imperatively sync OG/Twitter meta tags into <head>. React 19 hoists <meta>
 * rendered in components, but doing it explicitly keeps a single source of
 * truth and cleans up on unmount so stale tags don't bleed across navigations.
 */
function ProductMeta({
  url,
  title,
  description,
  image,
  price,
  locale,
}: {
  url: string;
  title: string;
  description: string;
  image?: string;
  price: number;
  locale: "en" | "ar";
}) {
  const tags: Array<{ attr: "property" | "name"; key: string; value: string }> = [
    { attr: "property", key: "og:type", value: "product" },
    { attr: "property", key: "og:title", value: title },
    { attr: "property", key: "og:description", value: description },
    { attr: "property", key: "og:url", value: url },
    { attr: "property", key: "og:locale", value: locale === "ar" ? "ar_IQ" : "en_IQ" },
    { attr: "property", key: "product:price:amount", value: String(price) },
    { attr: "property", key: "product:price:currency", value: "IQD" },
    { attr: "name", key: "twitter:card", value: image ? "summary_large_image" : "summary" },
    { attr: "name", key: "twitter:title", value: title },
    { attr: "name", key: "twitter:description", value: description },
  ];
  if (image) {
    tags.push({ attr: "property", key: "og:image", value: image });
    tags.push({ attr: "name", key: "twitter:image", value: image });
  }
  return (
    <>
      {tags.map((t) =>
        t.attr === "property" ? (
          <meta key={t.key} property={t.key} content={t.value} />
        ) : (
          <meta key={t.key} name={t.key} content={t.value} />
        ),
      )}
    </>
  );
}
