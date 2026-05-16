"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { freezoneApiUrl } from "@/lib/api-internal";
import type { HeroLinkTarget } from "@/lib/hero-link-target";
import {
  inferHeroLinkModeFromTarget,
  parseHeroLinkTarget,
  resolveHeroLinkTargetToHref,
} from "@/lib/hero-link-target";

type CatRow = { id: number; slug: string; nameEn: string; nameAr: string; sortOrder?: number };
type BrandRow = { id: number; slug: string; nameEn: string; nameAr: string; sortOrder?: number };
type ProductRow = {
  id: number;
  nameEn: string;
  nameAr: string;
  category?: { slug: string; nameEn: string; nameAr: string } | null;
};

type Catalog = { categories: CatRow[]; brands: BrandRow[]; products: ProductRow[] };

let catalogPromise: Promise<Catalog> | null = null;

function loadAdminCatalog(): Promise<Catalog> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const base = { credentials: "include" as const };
      const [cRes, bRes, pRes] = await Promise.all([
        fetch(freezoneApiUrl("/api/admin/categories"), base),
        fetch(freezoneApiUrl("/api/admin/brands"), base),
        fetch(freezoneApiUrl("/api/admin/products"), base),
      ]);
      const categories = cRes.ok ? ((await cRes.json()) as CatRow[]) : [];
      const brands = bRes.ok ? ((await bRes.json()) as BrandRow[]) : [];
      const products = pRes.ok ? ((await pRes.json()) as ProductRow[]) : [];
      const sortNum = (a: { sortOrder?: number }, b: { sortOrder?: number }) =>
        (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      categories.sort(sortNum);
      brands.sort(sortNum);
      return { categories, brands, products };
    })().catch((e) => {
      catalogPromise = null;
      throw e;
    });
  }
  return catalogPromise;
}

const selStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #334155",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
  fontSize: 13,
  boxSizing: "border-box",
};

type Props = {
  title: string;
  href: string;
  linkTarget: unknown;
  locale: "en" | "ar";
  onChange: (next: { href: string; linkTarget: HeroLinkTarget | null }) => void;
};

export function HeroDestLinkEditor({ title, href, linkTarget, locale, onChange }: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadAdminCatalog()
      .then((c) => {
        if (!cancelled) setCatalog(c);
      })
      .catch(() => {
        if (!cancelled) setLoadErr("تعذر تحميل القوائم — تحقق من الاتصال بالـ API وتسجيل الدخول.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsed = useMemo(() => parseHeroLinkTarget(linkTarget), [linkTarget]);
  const mode = inferHeroLinkModeFromTarget(linkTarget);

  const resolvedPreview = resolveHeroLinkTargetToHref(parsed, href);

  const emit = (nextMode: typeof mode, payload: Partial<{ href: string; slug: string; productId: number }>) => {
    if (nextMode === "url") {
      const h = (payload.href ?? href).trim() || "/products";
      onChange({ href: h, linkTarget: null });
      return;
    }
    if (nextMode === "product") {
      const id = Number(payload.productId);
      if (!Number.isFinite(id) || id <= 0) return;
      const t: HeroLinkTarget = { kind: "product", productId: Math.round(id) };
      onChange({ href: resolveHeroLinkTargetToHref(t, href), linkTarget: t });
      return;
    }
    if (nextMode === "category") {
      const slug = (payload.slug ?? "").trim();
      if (!slug) return;
      const t: HeroLinkTarget = { kind: "category", slug };
      onChange({ href: resolveHeroLinkTargetToHref(t, href), linkTarget: t });
      return;
    }
    if (nextMode === "brand") {
      const slug = (payload.slug ?? "").trim();
      if (!slug) return;
      const t: HeroLinkTarget = { kind: "brand", slug };
      onChange({ href: resolveHeroLinkTargetToHref(t, href), linkTarget: t });
    }
  };

  const name = (row: { nameEn: string; nameAr: string }) => (locale === "en" ? row.nameEn : row.nameAr);

  return (
    <div style={{ border: "1px solid #1e293b", borderRadius: 8, padding: 10, background: "rgba(15,23,42,0.35)" }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "var(--admin-text)" }}>{title}</div>
      <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
        نوع الوجهة
      </label>
      <select
        style={{ ...selStyle, marginBottom: 10 }}
        value={mode}
        onChange={(e) => {
          const next = e.target.value as typeof mode;
          if (next === "url") emit("url", { href: href || "/products" });
          else if (next === "product" && catalog?.products[0])
            emit("product", { productId: catalog.products[0].id });
          else if (next === "category" && catalog?.categories[0])
            emit("category", { slug: catalog.categories[0].slug });
          else if (next === "brand" && catalog?.brands[0]) emit("brand", { slug: catalog.brands[0].slug });
        }}
      >
        <option value="url">رابط يدوي (مسار أو https://)</option>
        <option value="product">منتج من الكتالوج</option>
        <option value="category">قسم (تصنيف)</option>
        <option value="brand">علامة تجارية</option>
      </select>

      {loadErr ? <p style={{ fontSize: 12, color: "#fecaca", margin: "0 0 8px" }}>{loadErr}</p> : null}

      {mode === "url" ? (
        <>
          <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
            الرابط
          </label>
          <input
            dir="ltr"
            style={selStyle}
            value={parsed?.kind === "url" ? parsed.href : href}
            placeholder="/products أو https://…"
            onChange={(e) => emit("url", { href: e.target.value })}
          />
        </>
      ) : null}

      {mode === "product" ? (
        <>
          <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
            اختر المنتج (آخر 200 في القائمة)
          </label>
          <select
            style={selStyle}
            value={parsed?.kind === "product" ? String(parsed.productId) : ""}
            disabled={!catalog?.products.length}
            onChange={(e) => emit("product", { productId: Number(e.target.value) })}
          >
            {!catalog?.products.length ? <option value="">— لا توجد منتجات —</option> : null}
            {(catalog?.products ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {name(p)}
                {p.category?.slug ? ` (${p.category.slug})` : ""}
              </option>
            ))}
          </select>
        </>
      ) : null}

      {mode === "category" ? (
        <>
          <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
            القسم
          </label>
          <select
            style={selStyle}
            value={parsed?.kind === "category" ? parsed.slug : ""}
            disabled={!catalog?.categories.length}
            onChange={(e) => emit("category", { slug: e.target.value })}
          >
            {!catalog?.categories.length ? <option value="">— لا توجد أقسام —</option> : null}
            {(catalog?.categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {name(c)} ({c.slug})
              </option>
            ))}
          </select>
        </>
      ) : null}

      {mode === "brand" ? (
        <>
          <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
            العلامة التجارية
          </label>
          <select
            style={selStyle}
            value={parsed?.kind === "brand" ? parsed.slug : ""}
            disabled={!catalog?.brands.length}
            onChange={(e) => emit("brand", { slug: e.target.value })}
          >
            {!catalog?.brands.length ? <option value="">— لا توجد علامات —</option> : null}
            {(catalog?.brands ?? []).map((b) => (
              <option key={b.id} value={b.slug}>
                {name(b)} ({b.slug})
              </option>
            ))}
          </select>
        </>
      ) : null}

      <p style={{ fontSize: 11, color: "#64748b", margin: "8px 0 0", direction: "ltr" }}>
        → {resolvedPreview}
      </p>
    </div>
  );
}
