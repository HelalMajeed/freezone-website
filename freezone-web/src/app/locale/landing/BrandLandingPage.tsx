"use client";

import { useCallback, useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { SlidersHorizontal } from "lucide-react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { fetchCatalogProducts } from "@/lib/catalog-products-api";
import { ProductCard } from "@/components/ui/ProductCard";
import { PaginationControls } from "@/components/ui/PaginationControls";
import { Seo } from "@/components/seo/Seo";
import { BreadcrumbJsonLd } from "@/components/seo/BreadcrumbJsonLd";
import styles from "./landing.module.css";

const BRAND_PAGE_SIZE = 24;

/** URL-safe brand slug (brands have no DB slug on the storefront payload). */
export function brandSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Brand landing page — /:locale/brand/:slug (docs/STOREFRONT_DESIGN.md).
 *  Products are server-paginated (GET /api/ssr/catalog/products?brand=…); the
 *  server brand WHERE matches the display name + brandRef (case-insensitive). */
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
  const displayName = brand?.name ?? decoded;

  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);

  const { data, isFetching } = useQuery({
    queryKey: ["brand-landing", lc, displayName, pageParam],
    queryFn: () => fetchCatalogProducts({ locale: lc, brands: [displayName], page: pageParam, pageSize: BRAND_PAGE_SIZE }),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const pageProducts = data?.products ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / BRAND_PAGE_SIZE));
  const loading = isFetching && !data;

  const goToPage = useCallback(
    (p: number) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (p > 1) next.set("page", String(p));
        else next.delete("page");
        return next;
      });
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    },
    [setSearchParams],
  );

  useEffect(() => {
    if (data && pageParam > pageCount) goToPage(pageCount);
  }, [data, pageParam, pageCount, goToPage]);

  /** Unknown brand slug with no matching products — bounce to the catalog. */
  if (!brand && data && total === 0) {
    return <Navigate to={`/${lc}/products`} replace />;
  }

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
            <span className={styles.countPill}>{t("productsCount", { count: total })}</span>
            <Link href={`/products?brand=${encodeURIComponent(displayName)}`} className={styles.filtersLink}>
              <SlidersHorizontal size={15} aria-hidden />
              {t("openFilters")}
            </Link>
          </div>
        </div>
      </header>

      <div className="container">
        {loading ? (
          <div className={styles.empty}>
            <p>{lc === "ar" ? "جاري التحميل…" : "Loading…"}</p>
          </div>
        ) : total === 0 ? (
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
            <PaginationControls page={pageParam} pageCount={pageCount} onPageChange={goToPage} />
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
