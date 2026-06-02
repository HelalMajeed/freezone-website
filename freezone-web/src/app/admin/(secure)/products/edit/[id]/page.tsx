"use client";

import { useParams } from "react-router-dom";
import { ProductEditorWorkspace } from "@/components/admin/products/editor/ProductEditorWorkspace";

export default function AdminProductEditPage() {
  const { id } = useParams();
  const productId = Number.parseInt(id ?? "", 10);
  if (!Number.isFinite(productId)) {
    return <p>معرّف منتج غير صالح</p>;
  }
  return (
    <div style={{ width: "100%", maxWidth: "min(1600px, 100%)", margin: "0 auto", padding: "16px 0 0" }}>
      <ProductEditorWorkspace productId={productId} />
    </div>
  );
}
