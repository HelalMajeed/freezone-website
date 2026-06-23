import { useSearchParams } from "react-router-dom";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductsCollectionClient } from "@/features/products/ProductsCollectionClient";
import { Seo } from "@/components/seo/Seo";
import { BreadcrumbJsonLd, type BreadcrumbItem } from "@/components/seo/BreadcrumbJsonLd";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
/** Same visible breadcrumb styling as the product page (single trail look sitewide). */
import crumbStyles from "@/features/product-detail/productDetail.module.css";

export default function ProductsPage() {
  const { catalog } = useStorefront();
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") ?? "";
  const initialBrand = searchParams.get("brand") ?? "";
  const initialFeatured = searchParams.get("featured") === "true";

  const catName = (c: { name: string; nameAr?: string }) =>
    locale === "ar" ? c.nameAr || c.name : c.name;

  const activeCategory = initialCat ? catalog.categories.find((c) => c.id === initialCat) : undefined;
  const parentCategory = activeCategory?.parent
    ? catalog.categories.find((c) => c.id === activeCategory.parent)
    : undefined;
  const categoryName = activeCategory ? catName(activeCategory) : "";

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tSeo("breadcrumbHome"), path: `/${locale}` },
    { name: tSeo("breadcrumbProducts"), path: `/${locale}/products` },
    ...(parentCategory
      ? [{ name: catName(parentCategory), path: `/${locale}/category/${parentCategory.id}` }]
      : []),
    ...(activeCategory
      ? [{ name: categoryName, path: `/${locale}/category/${activeCategory.id}` }]
      : []),
  ];

  return (
    <>
      <Seo
        title={categoryName ? tSeo("categoryTitle", { name: categoryName }) : tSeo("productsTitle")}
        description={
          categoryName ? tSeo("categoryDesc", { name: categoryName }) : tSeo("productsDesc")
        }
        canonicalPath={`/${locale}/products`}
      />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <div className={crumbStyles.breadcrumbBar}>
        <nav className={`container ${crumbStyles.breadcrumb}`} aria-label={tSeo("breadcrumbAria")}>
          <Link href="/" prefetch>
            {tSeo("breadcrumbHome")}
          </Link>
          <span className={crumbStyles.separator}>/</span>
          {activeCategory ? (
            <>
              <Link href="/products" prefetch>
                {tSeo("breadcrumbProducts")}
              </Link>
              {parentCategory ? (
                <>
                  <span className={crumbStyles.separator}>/</span>
                  <Link href={`/products?cat=${encodeURIComponent(parentCategory.id)}`}>
                    {catName(parentCategory)}
                  </Link>
                </>
              ) : null}
              <span className={crumbStyles.separator}>/</span>
              <span className={crumbStyles.current}>{categoryName}</span>
            </>
          ) : (
            <span className={crumbStyles.current}>{tSeo("breadcrumbProducts")}</span>
          )}
        </nav>
      </div>
      <ProductsCollectionClient
        categories={catalog.categories}
        initialCat={initialCat}
        initialBrand={initialBrand}
        initialFeatured={initialFeatured}
      />
    </>
  );
}
