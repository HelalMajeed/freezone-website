import { useSearchParams } from "react-router-dom";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductsCollectionClient } from "@/features/products/ProductsCollectionClient";
import { Seo } from "@/components/seo/Seo";
import { useLocale, useTranslations } from "@/i18n/hooks";

export default function ProductsPage() {
  const { catalog } = useStorefront();
  const tSeo = useTranslations("Seo");
  const locale = useLocale();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") ?? "";
  const initialBrand = searchParams.get("brand") ?? "";
  const initialFeatured = searchParams.get("featured") === "true";

  const activeCategory = initialCat ? catalog.categories.find((c) => c.id === initialCat) : undefined;
  const categoryName = activeCategory
    ? locale === "ar"
      ? activeCategory.nameAr || activeCategory.name
      : activeCategory.name
    : "";

  return (
    <>
      <Seo
        title={categoryName ? tSeo("categoryTitle", { name: categoryName }) : tSeo("productsTitle")}
        description={
          categoryName ? tSeo("categoryDesc", { name: categoryName }) : tSeo("productsDesc")
        }
        canonicalPath={`/${locale}/products`}
      />
      <ProductsCollectionClient
        products={catalog.products}
        categories={catalog.categories}
        initialCat={initialCat}
        initialBrand={initialBrand}
        initialFeatured={initialFeatured}
      />
    </>
  );
}
