"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AdminProductsTable } from "@/components/admin/products/AdminProductsTable";
import { freezoneApiUrl } from "@/lib/api-internal";

type Category = { id: number; slug: string; nameEn: string; nameAr?: string };

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const res = await fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      setLoading(false);
      return;
    }
    if (res.ok) setCategories((await res.json()) as Category[]);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, nameEn: c.nameEn, nameAr: c.nameAr ?? "", slug: c.slug })),
    [categories],
  );

  return (
    <div style={{ padding: "16px 20px 32px", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 12 }}>
        <Link to="/admin" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
          ← لوحة التحكم
        </Link>
        <Link to="/admin/categories" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
          الأقسام
        </Link>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "1.5rem" }}>المنتجات</h1>
          <p style={{ color: "var(--admin-muted)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            جدول مع pagination من الخادم. المواصفات والفلاتر من محرر المنتج (تبويبات).
          </p>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>
      ) : (
        <AdminProductsTable categories={categoryOptions} />
      )}
    </div>
  );
}
