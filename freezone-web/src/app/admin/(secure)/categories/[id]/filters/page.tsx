"use client";

import { Navigate, useParams } from "react-router-dom";

export default function AdminCategoryFiltersTabPage() {
  const id = useParams().id ?? "";
  if (!/^\d+$/.test(id)) return <Navigate to="/admin/categories" replace />;
  return <Navigate to={`/admin/categories/${id}?tab=filters`} replace />;
}
