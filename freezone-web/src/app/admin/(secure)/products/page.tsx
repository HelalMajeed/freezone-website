"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { AdminProductCatalog } from "@/components/admin/products-catalog/AdminProductCatalog";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import { parseAdminProductsFromApi } from "@/components/admin/products-catalog/admin-product-types";

type Category = { id: number; slug: string; nameEn: string; nameAr?: string; facetKeys?: unknown };

export default function AdminProductsPage() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [list, setList] = useState<AdminProductRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  const load = useCallback(async () => {
    setListLoading(true);
    const [c, p] = await Promise.all([
      fetch("/api/admin/categories", { credentials: "include" }),
      fetch("/api/admin/products", { credentials: "include" }),
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
      <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>المنتجات</h1>
      <p style={{ color: "var(--admin-muted)", marginBottom: 16, fontSize: 13, lineHeight: 1.5 }}>
        تصفّح حسب التصنيف من الشريط الجانبي أو العنوان في الرابط (<code dir="ltr">?cat=id&slug=</code>)، ثم أضف منتجاً من صفحة مخصصة.
      </p>

      <AdminProductCatalog products={list} categories={categoryOptions} loading={listLoading} onRefresh={() => void load()} />
    </div>
  );
}
