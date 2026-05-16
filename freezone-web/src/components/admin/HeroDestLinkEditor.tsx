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
  brandRef?: { slug: string; nameEn: string; nameAr: string } | null;
  secondaryCategories?: { categoryId: number }[];
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

function catIdToSlugMap(categories: CatRow[]): Map<number, string> {
  return new Map(categories.map((c) => [c.id, c.slug]));
}

function productInCategorySlug(
  p: ProductRow,
  catSlug: string,
  idToSlug: Map<number, string>,
): boolean {
  if (!catSlug) return false;
  if (p.category?.slug === catSlug) return true;
  for (const sc of p.secondaryCategories ?? []) {
    if (idToSlug.get(sc.categoryId) === catSlug) return true;
  }
  return false;
}

function catalogSelectionFromTarget(
  linkTarget: unknown,
  products: ProductRow[],
): { cat: string; brand: string; productId: string } {
  const t = parseHeroLinkTarget(linkTarget);
  if (!t || t.kind === "url") return { cat: "", brand: "", productId: "" };
  if (t.kind === "catalog") {
    return {
      cat: t.categorySlug,
      brand: t.brandSlug ?? "",
      productId: t.productId ? String(t.productId) : "",
    };
  }
  if (t.kind === "category") return { cat: t.slug, brand: "", productId: "" };
  if (t.kind === "brand") return { cat: "", brand: t.slug, productId: "" };
  if (t.kind === "product") {
    const prod = products.find((x) => x.id === t.productId);
    return {
      cat: prod?.category?.slug ?? "",
      brand: prod?.brandRef?.slug ?? "",
      productId: String(t.productId),
    };
  }
  return { cat: "", brand: "", productId: "" };
}

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

  const idToSlug = useMemo(() => catIdToSlugMap(catalog?.categories ?? []), [catalog?.categories]);

  const sel = useMemo(
    () => catalogSelectionFromTarget(linkTarget, catalog?.products ?? []),
    [linkTarget, catalog?.products],
  );

  const mode = inferHeroLinkModeFromTarget(linkTarget);
  const parsed = useMemo(() => parseHeroLinkTarget(linkTarget), [linkTarget]);
  const resolvedPreview = resolveHeroLinkTargetToHref(parsed, href);

  const brandsInCategory = useMemo(() => {
    if (!catalog || !sel.cat) return [];
    const slugs = new Set<string>();
    for (const p of catalog.products) {
      if (!productInCategorySlug(p, sel.cat, idToSlug)) continue;
      const bs = p.brandRef?.slug?.trim();
      if (bs) slugs.add(bs);
    }
    return catalog.brands.filter((b) => slugs.has(b.slug));
  }, [catalog, sel.cat, idToSlug]);

  const productsFiltered = useMemo(() => {
    if (!catalog || !sel.cat) return [];
    return catalog.products.filter((p) => {
      if (!productInCategorySlug(p, sel.cat, idToSlug)) return false;
      if (sel.brand && p.brandRef?.slug !== sel.brand) return false;
      return true;
    });
  }, [catalog, sel.cat, sel.brand, idToSlug]);

  const name = (row: { nameEn: string; nameAr: string }) => (locale === "en" ? row.nameEn : row.nameAr);

  const emitUrl = (nextHref: string) => {
    const h = nextHref.trim() || "/products";
    onChange({ href: h, linkTarget: null });
  };

  const emitCatalog = (next: { cat: string; brand: string; productId: string }) => {
    const cat = next.cat.trim();
    if (!cat) return;
    const brand = next.brand.trim() || null;
    const pid = Number(next.productId);
    const productId = Number.isFinite(pid) && pid > 0 ? Math.round(pid) : null;
    const t: HeroLinkTarget = { kind: "catalog", categorySlug: cat, brandSlug: brand, productId };
    onChange({ href: resolveHeroLinkTargetToHref(t, href), linkTarget: t });
  };

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
          const next = e.target.value as "url" | "catalog";
          if (next === "url") emitUrl(href || "/products");
          else if (catalog?.categories[0]) {
            emitCatalog({ cat: catalog.categories[0].slug, brand: "", productId: "" });
          }
        }}
      >
        <option value="url">رابط يدوي (مسار أو https://)</option>
        <option value="catalog">من الكتالوج: قسم → صنف/علامة → منتج (اختياري)</option>
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
            onChange={(e) => emitUrl(e.target.value)}
          />
        </>
      ) : null}

      {mode === "catalog" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
              القسم <span style={{ color: "#f87171" }}>*</span>
            </label>
            <select
              style={selStyle}
              value={
                sel.cat && (catalog?.categories ?? []).some((c) => c.slug === sel.cat) ? sel.cat : ""
              }
              disabled={!catalog?.categories.length}
              onChange={(e) => {
                const cat = e.target.value;
                emitCatalog({ cat, brand: "", productId: "" });
              }}
            >
              {catalog?.categories?.length ? (
                <>
                  <option value="" disabled>
                    — اختر القسم —
                  </option>
                  {(catalog?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.slug}>
                      {name(c)} ({c.slug})
                    </option>
                  ))}
                </>
              ) : (
                <option value="" disabled>
                  — لا توجد أقسام —
                </option>
              )}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
              الصنف / العلامة (اختياري)
            </label>
            <select
              style={selStyle}
              value={brandsInCategory.some((b) => b.slug === sel.brand) ? sel.brand : ""}
              disabled={!sel.cat}
              onChange={(e) => {
                const brand = e.target.value;
                emitCatalog({ cat: sel.cat, brand, productId: "" });
              }}
            >
              <option value="">— كل الأصناف في القسم —</option>
              {brandsInCategory.map((b) => (
                <option key={b.id} value={b.slug}>
                  {name(b)} ({b.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 11, color: "var(--admin-muted)", display: "block", marginBottom: 4 }}>
              منتج محدد (اختياري)
            </label>
            <select
              style={selStyle}
              value={productsFiltered.some((p) => String(p.id) === sel.productId) ? sel.productId : ""}
              disabled={!sel.cat}
              onChange={(e) => {
                emitCatalog({ cat: sel.cat, brand: sel.brand, productId: e.target.value });
              }}
            >
              <option value="">— وجّه لصفحة القائمة (القسم{sel.brand ? " + الصنف" : ""}) —</option>
              {productsFiltered.map((p) => (
                <option key={p.id} value={String(p.id)}>
                  #{p.id} — {name(p)}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, lineHeight: 1.45 }}>
            يُحدَّد المسار كالتالي: إن اخترت منتجاً يُفتح صفحة المنتج؛ وإلا صفحة المنتجات مع تصفية القسم (والعلامة إن
            اخترتها).
          </p>
        </div>
      ) : null}

      <p style={{ fontSize: 11, color: "#64748b", margin: "8px 0 0", direction: "ltr" }}>
        → {resolvedPreview}
      </p>
    </div>
  );
}
