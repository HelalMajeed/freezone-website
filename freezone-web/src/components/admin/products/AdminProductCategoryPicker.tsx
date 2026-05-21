"use client";

import { Link } from "react-router-dom";

type Cat = { id: number; slug: string; nameEn: string; nameAr?: string };

export function AdminProductCategoryPicker({ categories }: { categories: Cat[] }) {
  return (
    <div style={{ maxWidth: 640 }}>
      <h2 style={{ margin: "0 0 8px", fontSize: "1.15rem" }}>اختر القسم أولاً</h2>
      <p style={{ color: "var(--admin-muted)", fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>
        كل منتج ينتمي إلى قسم يحدد الفلاتر ومواصفات العرض. ابدأ من القسم المناسب ثم أضف المنتج.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {categories.map((c) => (
          <li key={c.id}>
            <Link
              to={`/admin/products/new?categoryId=${c.id}`}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid var(--admin-border)",
                background: "var(--admin-surface-muted)",
                color: "var(--admin-text)",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              <span>{c.nameAr || c.nameEn}</span>
              <span style={{ fontSize: 12, color: "var(--admin-muted)" }} dir="ltr">
                {c.slug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p style={{ marginTop: 16, fontSize: 13 }}>
        <Link to="/admin/categories" style={{ color: "var(--admin-accent)", fontWeight: 700 }}>
          إدارة الأقسام
        </Link>
      </p>
    </div>
  );
}
