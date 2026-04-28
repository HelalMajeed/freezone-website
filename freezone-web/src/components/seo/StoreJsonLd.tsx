import type { PublicSite } from "@/lib/site-public";

/** Organization + WebSite structured data for SEO */
export function StoreJsonLd({ site, locale, baseUrl }: { site: PublicSite; locale: string; baseUrl: string }) {
  const sameAs = site.social.map((s) => s.url).filter(Boolean);
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${baseUrl}/#organization`,
        name: site.storeName,
        description: site.tagline,
        url: baseUrl,
        logo: site.logoUrl ? (site.logoUrl.startsWith("http") ? site.logoUrl : `${baseUrl}${site.logoUrl}`) : undefined,
        telephone: site.phone,
        ...(site.email?.trim() ? { email: site.email.trim() } : {}),
        address: {
          "@type": "PostalAddress",
          addressCountry: "IQ",
          streetAddress: site.address,
        },
        sameAs: sameAs.length ? sameAs : undefined,
      },
      {
        "@type": "WebSite",
        "@id": `${baseUrl}/#website`,
        url: baseUrl,
        name: site.storeName,
        description: site.metaDescription || site.tagline,
        inLanguage: locale === "ar" ? "ar-IQ" : "en-IQ",
        publisher: { "@id": `${baseUrl}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: `${baseUrl}/${locale}/products?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
