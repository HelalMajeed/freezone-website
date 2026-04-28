import { useSearchParams } from "react-router-dom";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductsCollectionClient } from "@/features/products/ProductsCollectionClient";

export default function ProductsPage() {
  const { catalog } = useStorefront();
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") ?? "";
  const initialBrand = searchParams.get("brand") ?? "";
  const initialFeatured = searchParams.get("featured") === "true";

  return (
    <ProductsCollectionClient
      products={catalog.products}
      categories={catalog.categories}
      initialCat={initialCat}
      initialBrand={initialBrand}
      initialFeatured={initialFeatured}
    />
  );
}
