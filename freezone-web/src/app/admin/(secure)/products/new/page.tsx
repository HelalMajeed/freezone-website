"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminProductCreateForm } from "@/components/admin/products-catalog/AdminProductCreateForm";

type Category = { id: number; slug: string; nameEn: string; nameAr?: string; facetKeys?: unknown };
type BrandOpt = { id: number; nameEn: string; nameAr: string };

export default function AdminNewProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      fetch("/api/admin/categories", { credentials: "include" }),
      fetch("/api/admin/brands", { credentials: "include" }),
    ]);
    if (c.status === 401 || b.status === 401) {
      navigate("/admin/login", { replace: true });
      setLoading(false);
      return;
    }
    if (c.ok) setCategories((await c.json()) as Category[]);
    if (b.ok) setBrands((await b.json()) as BrandOpt[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const initialCategoryId = useMemo(() => {
    const cat = searchParams.get("cat");
    const slug = searchParams.get("slug");
    if (cat && /^\d+$/.test(cat)) {
      const id = Number(cat);
      if (categories.some((x) => x.id === id)) return id;
    }
    if (slug && categories.length) {
      const hit = categories.find((x) => x.slug === slug);
      if (hit) return hit.id;
    }
    return null;
  }, [searchParams, categories]);

  return (
    <div style={{ padding: "16px 20px 40px", width: "100%", maxWidth: 900, boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <Link to="/admin/products" style={{ color: "var(--admin-accent)", fontWeight: 700, fontSize: 14 }}>
          ← كتالوج المنتجات
        </Link>
        <span style={{ color: "var(--admin-border-strong)" }} aria-hidden>
          |
        </span>
        <Link to="/admin" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
          لوحة التحكم
        </Link>
      </div>
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>إضافة منتج جديد</h1>
      <p style={{ color: "var(--admin-muted)", marginBottom: 20, fontSize: 13, lineHeight: 1.55 }}>
        اختر التصنيف والعلامة والأسعار والصور. حقول المواصفات حسب التصنيف اختيارية — اضبط facetKeys من «التصنيفات».
      </p>

      {loading ? (
        <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>
      ) : (
        <AdminProductCreateForm
          categories={categories}
          brands={brands}
          initialCategoryId={initialCategoryId}
          onSuccess={() => navigate("/admin/products")}
        />
      )}
    </div>
  );
}
