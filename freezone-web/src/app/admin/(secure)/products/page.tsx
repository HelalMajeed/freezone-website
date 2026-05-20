"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AdminProductsTable } from "@/components/admin/products/AdminProductsTable";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { parseAdminProductsFromApi } from "@/components/admin/products-catalog/admin-product-types";
import { freezoneApiUrl } from "@/lib/api-internal";

type Category = { id: number; slug: string; nameEn: string; nameAr?: string; facetKeys?: unknown };

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<AdminProductRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    setListLoading(true);
    const [c, p] = await Promise.all([
      fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include" }),
      fetch(freezoneApiUrl("/api/admin/products"), { credentials: "include" }),
    ]);
    if (c.status === 401 || p.status === 401) {
      navigate("/admin/login", { replace: true });
      setListLoading(false);
      return;
    }
    if (c.ok) setCategories((await c.json()) as Category[]);
    if (p.ok) setList(parseAdminProductsFromApi(await p.json()));
    else setList([]);
    setListLoading(false);
  }, [navigate]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

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
        <Link to="/admin/cms" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
          CMS
        </Link>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: "0 0 6px", fontSize: "1.5rem" }}>المنتجات</h1>
          <p style={{ color: "var(--admin-muted)", margin: 0, fontSize: 13, lineHeight: 1.5 }}>
            جدول احترافي مع بحث وفلاتر. إدارة المواصفات والفلاتر من محرر المنتج (تبويبات).
          </p>
        </div>
        <Link
          to="/admin/products/new"
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            background: "#0b1f3b",
            color: "#fff",
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          + منتج جديد
        </Link>
      </div>

      <AdminProductsTable products={list} categories={categoryOptions} loading={listLoading} onRefresh={() => void load()} />
    </div>
  );
}
