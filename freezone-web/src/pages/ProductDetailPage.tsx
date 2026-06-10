import { useEffect } from "react";
import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { trackViewItem } from "@/lib/analytics";
import type { LocaleCode } from "@/lib/layout-cms";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import ProductDetailClient from "@/features/product-detail/ProductDetailClient";
import { productsShareAnyCategory } from "@/lib/productCategoryMembership";
import { getProductDetail } from "@/lib/product-detail";
import { Seo } from "@/components/seo/Seo";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import { BreadcrumbJsonLd, type BreadcrumbItem } from "@/components/seo/BreadcrumbJsonLd";
import { useTranslations } from "@/i18n/hooks";

export default function ProductDetailPage() {
  const { id, locale: loc } = useParams<{ id: string; locale: string }>();
  const lc: LocaleCode = loc === "ar" ? "ar" : "en";
  const num = parseInt(id ?? "", 10);
  const { catalog } = useStorefront();
  const tSeo = useTranslations("Seo");

  const { data: detail, isLoading, isFetched } = useQuery({
    queryKey: ["product-detail", num, lc],
    queryFn: () => getProductDetail(num, lc),
    enabled: Number.isFinite(num),
  });

  const viewed = detail?.product;
  useEffect(() => {
    if (viewed) {
      trackViewItem({
        id: viewed.id,
        name: viewed.name,
        price: viewed.price,
        brand: viewed.brand,
        category: viewed.cat,
      });
    }
  }, [viewed]);

  if (Number.isNaN(num)) {
    return <Navigate to=".." replace />;
  }
  if (isLoading) {
    return (
      <div className="container" style={{ padding: "80px 20px", textAlign: "center" }}>
        جاري التحميل…
      </div>
    );
  }
  if (isFetched && !detail?.product) {
    return <Navigate to="../products" replace />;
  }
  if (!detail?.product) {
    return null;
  }

  const relatedProducts = catalog.products
    .filter((p) => p.id !== detail.product.id && productsShareAnyCategory(p, detail.product))
    .slice(0, 4);

  const product = detail.product;
  const seoDescription = product.desc?.trim()
    ? product.desc.trim().slice(0, 250)
    : tSeo("productDesc", { name: product.name });

  const breadcrumbCategory = catalog.categories.find((c) => c.id === product.cat);
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tSeo("breadcrumbHome"), path: `/${lc}` },
    ...(breadcrumbCategory
      ? [
          {
            name: lc === "ar" ? breadcrumbCategory.nameAr || breadcrumbCategory.name : breadcrumbCategory.name,
            path: `/${lc}/category/${breadcrumbCategory.id}`,
          },
        ]
      : []),
    { name: product.name, path: `/${lc}/product/${product.id}` },
  ];

  return (
    <>
      <Seo
        title={product.name}
        description={seoDescription}
        image={product.images?.[0] ?? null}
        ogType="product"
      />
      <ProductJsonLd product={product} locale={lc} />
      <BreadcrumbJsonLd items={breadcrumbItems} />
      <ProductDetailClient
        product={product}
        categories={catalog.categories}
        relatedProducts={relatedProducts}
        groupedSpecs={detail.groupedSpecs}
        attributes={detail.attributes}
        variants={detail.variants}
      />
    </>
  );
}
