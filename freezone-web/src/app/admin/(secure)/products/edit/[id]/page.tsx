"use client";

import { useParams } from "react-router-dom";
import { ProductEditorWorkspace } from "@/components/admin/products/editor/ProductEditorWorkspace";

export default function AdminProductEditPage() {
  const { id } = useParams();
  const productId = Number.parseInt(id ?? "", 10);
  if (!Number.isFinite(productId)) {
    return <p>معرّف منتج غير صالح</p>;
  }
  return <ProductEditorWorkspace productId={productId} />;
}
