"use client";

import { Navigate, useParams } from "react-router-dom";

/** Alias: /admin/categories/:id/products/new → product create with category preselected. */
export default function AdminCategoryNewProductPage() {
  const params = useParams();
  const id = params.id ?? "";
  if (!/^\d+$/.test(id)) {
    return <Navigate to="/admin/products/new" replace />;
  }
  return <Navigate to={`/admin/products/new?categoryId=${id}`} replace />;
}
