"use client";

import { useMemo } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { SlidersHorizontal } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";
import { ProductCard } from "@/components/ui/ProductCard";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Seo } from "@/components/seo/Seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import styles from "./landing.module.css";

const LANDING_PAGE_SIZE = 24;

/** Category landing page — /:locale/category/:slug (docs/STOREFRONT_DESIGN.md). */
export default function CategoryLandingPage() {
  const { slug = "", locale: loc } = useParams<{ slug: string; locale: string }>();
  const lc = loc === "ar" ? "ar" : "en";
  const t = useTranslations("Landing");
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const { catalog } = useStorefront();

  const category = catalog.categories.find((c) => c.id === slug);

  const products = useMemo(
    () => catalog.products.filter((p) => productBelongsToCategory(p, slug)),
    [catalog.products, slug],
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const pageCount = Math.max(1, Math.ceil(products.length / LANDING_PAGE_SIZE));
  /** Clamp a stale ?page from a shared URL instead of rendering an empty grid. */
  const page = Math.min(
    Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1),
    pageCount,
  );
  const pageProducts = useMemo(
    () => products.slice((page - 1) * LANDING_PAGE_SIZE, page * LANDING_PAGE_SIZE),
    [products, page],
  );

  const goToPage = (p: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (p > 1) next.set("page", String(p));
      else next.delete("page");
      return next;
    });
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };

  if (!category) {
    return <Navigate to={`/${lc}/products`} replace />;
  }

  const name = locale === "ar" ? category.nameAr || category.name : category.name;

  return (
    <div className={styles.wrapper}>
      <Seo
        title={tSeo("categoryTitle", { name })}
        description={tSeo("categoryDesc", { name })}
        image={category.img}
      />
      <BreadcrumbJsonLd
        items={[
          { name: tSeo("breadcrumbHome"), path: `/${lc}` },
          { name, path: `/${lc}/category/${category.id}` },
        ]}
      />

      <header className={styles.hero}>
        {category.img ? <img src={category.img} alt="" className={styles.heroImage} aria-hidden /> : null}
        <div className={`container ${styles.heroInner}`}>
          <span className={styles.eyebrow}>{t("categoryEyebrow")}</span>
          <h1 className={`fz-type-h1 ${styles.heroTitle}`}>{name}</h1>
          <div className={styles.heroMeta}>
            <span className={styles.countPill}>{t("productsCount", { count: products.length })}</span>
            <Link href={`/products?cat=${encodeURIComponent(category.id)}`} className={styles.filtersLink}>
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
              {pageProducts.map((p) => (
                <ProductCard key={p.id} product={p} categories={catalog.categories} />
              ))}
            </div>
            <PaginationControls page={page} pageCount={pageCount} onPageChange={goToPage} />
            <div className={styles.footerCta}>
              <Link href={`/products?cat=${encodeURIComponent(category.id)}`} className="btn-outline">
                {t("openFilters")}
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
