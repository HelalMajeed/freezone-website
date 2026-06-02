"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AdminProductCreateForm } from "@/components/admin/products/AdminProductCreateForm";
import { AdminProductCategoryPicker } from "@/components/admin/products/AdminProductCategoryPicker";
import { freezoneApiUrl } from "@/lib/api-internal";

type Category = { id: number; slug: string; nameEn: string; nameAr?: string; facetKeys?: unknown };
type BrandOpt = { id: number; nameEn: string; nameAr: string };

function resolveCategoryId(
  searchParams: URLSearchParams,
  categories: Category[],
): number | null {
  const raw =
    searchParams.get("categoryId") ?? searchParams.get("cat") ?? searchParams.get("category");
  if (raw && /^\d+$/.test(raw)) {
    const id = Number(raw);
    if (categories.some((x) => x.id === id)) return id;
  }
  const slug = searchParams.get("slug");
  if (slug) {
    const hit = categories.find((x) => x.slug === slug);
    if (hit) return hit.id;
  }
  return null;
}

export default function AdminNewProductPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<BrandOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [c, b] = await Promise.all([
      fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include" }),
      fetch(freezoneApiUrl("/api/admin/brands"), { credentials: "include" }),
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

  const initialCategoryId = useMemo(
    () => resolveCategoryId(searchParams, categories),
    [searchParams, categories],
  );

  const category = initialCategoryId != null ? categories.find((c) => c.id === initialCategoryId) : null;

  return (
    <div style={{ padding: "16px 24px 40px", width: "100%", maxWidth: "min(1600px, 100%)", boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
        <Link to="/admin/categories" style={{ color: "var(--admin-accent)", fontWeight: 700, fontSize: 14 }}>
          ← الأقسام
        </Link>
        {category ? (
          <>
            <span style={{ color: "var(--admin-border-strong)" }} aria-hidden>
              |
            </span>
            <Link
              to={`/admin/categories/${category.id}`}
              style={{ color: "var(--admin-muted)", fontSize: 13 }}
            >
              {category.nameAr || category.nameEn}
            </Link>
          </>
        ) : (
          <Link to="/admin/products" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
            كل المنتجات
          </Link>
        )}
      </div>

      {loading ? (
        <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>
      ) : initialCategoryId == null ? (
        <AdminProductCategoryPicker categories={categories} />
      ) : (
        <>
          <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>
            إضافة منتج — {category?.nameAr || category?.nameEn}
          </h1>
          <p style={{ color: "var(--admin-muted)", marginBottom: 20, fontSize: 13, lineHeight: 1.55 }}>
            بعد «حفظ المنتج» يُفتح محرّر كامل بـ<strong> 10 تبويبات</strong> (أساسي، وصف، صور، تسعير، مخزون، سمات، متغيرات،
            SEO، شحن، ملاحظات). النموذج أدناه للإنشاء السريع فقط (4 خطوات).
          </p>
          <AdminProductCreateForm
            categories={categories}
            brands={brands}
            initialCategoryId={initialCategoryId}
            lockCategory
          />
        </>
      )}
    </div>
  );
}
