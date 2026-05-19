import { Navigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { LocaleCode } from "@/lib/layout-cms";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import ProductDetailClient from "@/features/product-detail/ProductDetailClient";
import { productsShareAnyCategory } from "@/lib/productCategoryMembership";
import { getProductDetail } from "@/lib/product-detail";

export default function ProductDetailPage() {
  const { id, locale: loc } = useParams<{ id: string; locale: string }>();
  const lc: LocaleCode = loc === "ar" ? "ar" : "en";
  const num = parseInt(id ?? "", 10);
  const { catalog } = useStorefront();

  const { data: detail, isLoading, isFetched } = useQuery({
    queryKey: ["product-detail", num, lc],
    queryFn: () => getProductDetail(num, lc),
    enabled: Number.isFinite(num),
  });

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

  return (
    <ProductDetailClient
      product={detail.product}
      categories={catalog.categories}
      relatedProducts={relatedProducts}
      groupedSpecs={detail.groupedSpecs}
      attributes={detail.attributes}
    />
  );
}
