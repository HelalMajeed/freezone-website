"use client";

import { useMemo } from "react";
import { Navigate, useParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductCard } from "@/components/ui/ProductCard";
import { Seo } from "@/components/seo/Seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import styles from "./landing.module.css";

/** URL-safe brand slug (brands have no DB slug on the storefront payload). */
export function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Brand landing page — /:locale/brand/:slug (docs/STOREFRONT_DESIGN.md). */
export default function BrandLandingPage() {
  const { slug = "", locale: loc } = useParams<{ slug: string; locale: string }>();
  const lc = loc === "ar" ? "ar" : "en";
  const t = useTranslations("Landing");
  const tSeo = useTranslations("Seo");
  const { catalog } = useStorefront();

  const decoded = decodeURIComponent(slug);
  const brand =
    catalog.brands.find((b) => brandSlug(b.name) === decoded) ??
    catalog.brands.find((b) => b.name.toLowerCase() === decoded.toLowerCase());

  /** Products match on display brand name (catalog products carry no brand id). */
  const brandName = brand?.name ?? decoded;
  const products = useMemo(
    () =>
      catalog.products.filter(
        (p) => p.brand && (brandSlug(p.brand) === decoded || p.brand.toLowerCase() === brandName.toLowerCase()),
      ),
    [catalog.products, decoded, brandName],
  );

  if (!brand && products.length === 0) {
    return <Navigate to={`/${lc}/products`} replace />;
  }

  const displayName = brand?.name ?? products[0]?.brand ?? decoded;

  return (
    <div className={styles.wrapper}>
      <Seo title={tSeo("brandTitle", { name: displayName })} description={tSeo("brandDesc", { name: displayName })} />
      <BreadcrumbJsonLd
        items={[
          { name: tSeo("breadcrumbHome"), path: `/${lc}` },
          { name: displayName, path: `/${lc}/brand/${slug}` },
        ]}
      />

      <header className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <span className={styles.eyebrow}>{t("brandEyebrow")}</span>
          {brand?.img ? <img src={brand.img} alt={displayName} className={styles.brandLogo} width={120} height={56} /> : null}
          <h1 className={`fz-type-h1 ${styles.heroTitle}`}>{displayName}</h1>
          <div className={styles.heroMeta}>
            <span className={styles.countPill}>{t("productsCount", { count: products.length })}</span>
            <Link href={`/products?brand=${encodeURIComponent(displayName)}`} className={styles.filtersLink}>
              <SlidersHorizontal size={15} aria-hidden />
              {t("openFilters")}
            </Link>
          </div>
        </div>
      </header>

      <div className="container">
        {products.length === 0 ? (
          <div className={styles.empty}>
            <p>{t("noProducts")}</p>
            <Link href="/products" className="btn-primary">
              {t("viewAll")}
            </Link>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {products.map((p) => (
                <ProductCard key={p.id} product={p} categories={catalog.categories} />
              ))}
            </div>
            <div className={styles.footerCta}>
              <Link href={`/products?brand=${encodeURIComponent(displayName)}`} className="btn-outline">
                {t("openFilters")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
