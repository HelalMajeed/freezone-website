"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, LayoutGrid, List, Moon, Plus, RefreshCw, Sun } from "lucide-react";
import { fetchStorefrontBootstrap } from "@/lib/storefront-bootstrap";
import type { AdminProductRow } from "./admin-product-types";
import { adminProductInCategory, brandLabel, parseAdminProductsFromApi } from "./admin-product-types";
import { freezoneApiUrl } from "@/lib/api-internal";
import { readWishlistIds, toggleWishlistId } from "./admin-wishlist";
import { AdminProductCard } from "./AdminProductCard";
import { AdminProductQuickView } from "./AdminProductQuickView";
import styles from "./admin-product-catalog.module.css";

const PAGE_SIZE = 24;

export type CategoryOpt = { id: number; nameEn: string; nameAr: string; slug: string };

type Props = {
  rawList?: unknown;
  products?: AdminProductRow[] | null;
  categories: CategoryOpt[];
  loading?: boolean;
  onRefresh?: () => void;
};

type SortKey = "new" | "price-asc" | "price-desc" | "popular" | "name-asc" | "name-desc" | "reviews-desc";
type StockFilter = "all" | "in" | "out";
type PublishedFilter = "all" | "yes" | "no";
type HasImageFilter = "all" | "yes" | "no";

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function waHref(phone: string, text: string): string | null {
  const d = digitsOnly(phone);
  if (d.length < 8) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(text)}`;
}

function stockOk(p: AdminProductRow): boolean {
  return p.inStock && p.quantity > 0;
}

function onSale(p: AdminProductRow): boolean {
  return p.oldPrice != null && p.oldPrice > p.price;
}

function applySort(rows: AdminProductRow[], sort: SortKey): AdminProductRow[] {
  const arr = [...rows];
  switch (sort) {
    case "price-asc":
      return arr.sort((a, b) => a.price - b.price);
    case "price-desc":
      return arr.sort((a, b) => b.price - a.price);
    case "popular":
      return arr.sort((a, b) => b.sales - a.sales || b.reviews - a.reviews);
    case "name-asc":
      return arr.sort((a, b) =>
        (a.nameAr || a.nameEn).localeCompare(b.nameAr || b.nameEn, "ar", { sensitivity: "base" }),
      );
    case "name-desc":
      return arr.sort((a, b) =>
        (b.nameAr || b.nameEn).localeCompare(a.nameAr || a.nameEn, "ar", { sensitivity: "base" }),
      );
    case "reviews-desc":
      return arr.sort((a, b) => b.reviews - a.reviews || b.rating - a.rating);
    case "new":
    default:
      return arr.sort((a, b) => b.id - a.id);
  }
}

export function AdminProductCatalog({ rawList, products: productsProp, categories, loading, onRefresh }: Props) {
  const [searchParams, setSearchParams] = useSearchParams();

  const products = useMemo(() => {
    if (productsProp != null) return productsProp;
    if (rawList !== undefined) return parseAdminProductsFromApi(rawList);
    return [];
  }, [productsProp, rawList]);

  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [sort, setSort] = useState<SortKey>("new");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [stock, setStock] = useState<StockFilter>("all");
  const [ratingMin, setRatingMin] = useState(0);
  const [brandQ, setBrandQ] = useState("");
  const deferredBrand = useDeferredValue(brandQ.trim().toLowerCase());
  const [published, setPublished] = useState<PublishedFilter>("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [saleOnly, setSaleOnly] = useState(false);
  const [hasImage, setHasImage] = useState<HasImageFilter>("all");
  const [wishlistOnly, setWishlistOnly] = useState(false);
  const [minReviews, setMinReviews] = useState(0);
  const [idQuery, setIdQuery] = useState("");
  const deferredId = useDeferredValue(idQuery.trim().replace(/^#/, ""));
  const [page, setPage] = useState(1);
  const [dark, setDark] = useState(false);
  const [wish, setWish] = useState(() => readWishlistIds());
  const [qv, setQv] = useState<AdminProductRow | null>(null);
  const [waPhone, setWaPhone] = useState("");
  const [mutatingId, setMutatingId] = useState<number | null>(null);

  const patchProduct = useCallback(
    async (id: number, body: { inStock?: boolean; published?: boolean }) => {
      setMutatingId(id);
      try {
        const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}`), {
          method: "PATCH",
          credentials: "include",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) onRefresh?.();
      } finally {
        setMutatingId(null);
      }
    },
    [onRefresh],
  );

  const deleteProduct = useCallback(
    async (id: number) => {
      if (!window.confirm("حذف المنتج نهائياً من قاعدة البيانات؟ لا يمكن التراجع.")) return;
      setMutatingId(id);
      try {
        const res = await fetch(freezoneApiUrl(`/api/admin/products/${id}`), {
          method: "DELETE",
          credentials: "include",
          cache: "no-store",
        });
        if (res.ok) {
          setQv((q) => (q?.id === id ? null : q));
          onRefresh?.();
        }
      } finally {
        setMutatingId(null);
      }
    },
    [onRefresh],
  );

  const updateCategoryInUrl = useCallback(
    (next: number | "") => {
      setCategoryId(next);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next === "") {
            p.delete("cat");
            p.delete("slug");
          } else {
            p.set("cat", String(next));
            const c = categories.find((x) => x.id === next);
            if (c?.slug) p.set("slug", c.slug);
          }
          return p;
        },
        { replace: true },
      );
    },
    [categories, setSearchParams],
  );

  useEffect(() => {
    if (!categories.length) return;
    const cat = searchParams.get("cat");
    const slug = searchParams.get("slug");
    if (cat && /^\d+$/.test(cat)) {
      const id = Number(cat);
      if (categories.some((c) => c.id === id)) {
        setCategoryId(id);
        return;
      }
    }
    if (slug) {
      const c = categories.find((x) => x.slug === slug);
      if (c) {
        setCategoryId(c.id);
        return;
      }
    }
    if (!cat && !slug) setCategoryId("");
  }, [searchParams, categories]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const boot = await fetchStorefrontBootstrap("ar");
        if (!cancelled) setWaPhone(boot.site.whatsapp ?? "");
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxPrice = useMemo(() => {
    const m = products.reduce((a, p) => Math.max(a, p.price), 0);
    return Math.max(m, 50_000);
  }, [products]);

  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(maxPrice);

  useEffect(() => {
    setPriceMax(maxPrice);
    setPriceMin(0);
  }, [maxPrice]);

  const countsByCategory = useMemo(() => {
    const m = new Map<number, number>();
    for (const p of products) {
      m.set(p.categoryId, (m.get(p.categoryId) ?? 0) + 1);
      for (const sid of p.secondaryCategoryIds ?? []) {
        m.set(sid, (m.get(sid) ?? 0) + 1);
      }
    }
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    let rows = products;
    const q = deferredSearch;
    if (q) {
      rows = rows.filter((p) => {
        const blob = `${p.nameEn} ${p.nameAr} ${p.descEn} ${p.descAr} ${p.id} ${p.category.slug}`.toLowerCase();
        return blob.includes(q);
      });
    }
    if (categoryId !== "") {
      rows = rows.filter((p) => adminProductInCategory(p, categoryId));
    }
    if (stock === "in") rows = rows.filter(stockOk);
    if (stock === "out") rows = rows.filter((p) => !stockOk(p));
    if (ratingMin > 0) rows = rows.filter((p) => p.rating >= ratingMin);
    if (deferredBrand) {
      rows = rows.filter(
        (p) => brandLabel(p).toLowerCase().includes(deferredBrand) || p.brand.toLowerCase().includes(deferredBrand),
      );
    }
    if (published === "yes") rows = rows.filter((p) => p.published);
    if (published === "no") rows = rows.filter((p) => !p.published);
    if (featuredOnly) rows = rows.filter((p) => p.featured);
    if (saleOnly) rows = rows.filter(onSale);
    if (hasImage === "yes") rows = rows.filter((p) => p.images.length > 0);
    if (hasImage === "no") rows = rows.filter((p) => p.images.length === 0);
    if (wishlistOnly) rows = rows.filter((p) => wish.has(p.id));
    if (minReviews > 0) rows = rows.filter((p) => p.reviews >= minReviews);
    const idTrim = deferredId;
    if (idTrim && /^\d+$/.test(idTrim)) {
      rows = rows.filter((p) => String(p.id) === idTrim);
    }
    rows = rows.filter((p) => p.price >= priceMin && p.price <= priceMax);
    return applySort(rows, sort);
  }, [
    products,
    deferredSearch,
    categoryId,
    stock,
    ratingMin,
    deferredBrand,
    priceMin,
    priceMax,
    sort,
    published,
    featuredOnly,
    saleOnly,
    hasImage,
    wishlistOnly,
    minReviews,
    deferredId,
    wish,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    deferredSearch,
    categoryId,
    stock,
    ratingMin,
    deferredBrand,
    priceMin,
    priceMax,
    sort,
    published,
    featuredOnly,
    saleOnly,
    hasImage,
    wishlistOnly,
    minReviews,
    deferredId,
  ]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const slice = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const activeCategory = categoryId === "" ? null : categories.find((c) => c.id === categoryId);

  const newProductHref = useMemo(() => {
    if (categoryId === "") return "/admin/products/new";
    const c = categories.find((x) => x.id === categoryId);
    const q = c?.slug ? `?cat=${categoryId}&slug=${encodeURIComponent(c.slug)}` : `?cat=${categoryId}`;
    return `/admin/products/new${q}`;
  }, [categoryId, categories]);

  const resetFilters = useCallback(() => {
    setSearch("");
    updateCategoryInUrl("");
    setSort("new");
    setStock("all");
    setRatingMin(0);
    setBrandQ("");
    setPriceMin(0);
    setPriceMax(maxPrice);
    setPublished("all");
    setFeaturedOnly(false);
    setSaleOnly(false);
    setHasImage("all");
    setWishlistOnly(false);
    setMinReviews(0);
    setIdQuery("");
    setPage(1);
  }, [maxPrice, updateCategoryInUrl]);

  const toggleWish = useCallback((id: number) => {
    setWish((prev) => toggleWishlistId(id, prev));
  }, []);

  const showSkeleton = Boolean(loading) && products.length === 0;

  return (
    <section className={styles.catalog} data-dark={dark ? "1" : "0"} dir="rtl">
      <div className={styles.heroBar}>
        <nav className={styles.breadcrumb} aria-label="مسار القسم">
          <Link to="/admin">لوحة التحكم</Link>
          <span aria-hidden>/</span>
          <Link to="/admin/products">المنتجات</Link>
          {activeCategory ? (
            <>
              <span aria-hidden>/</span>
              <span>{activeCategory.nameAr || activeCategory.nameEn}</span>
            </>
          ) : null}
        </nav>
        <div className={styles.titleRow}>
          <div>
            <h2>كتالوج المنتجات</h2>
            <p className={styles.sub}>تصفّح حسب القسم، رابط المشاركة يحدّث (?cat=&slug=)، ثم أضف منتجاً من صفحة مستقلة.</p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <Link className={styles.addProductBtn} to={newProductHref}>
              <Plus size={18} aria-hidden />
              إضافة منتج
            </Link>
            {onRefresh ? (
              <button type="button" className={styles.iconToggle} onClick={() => onRefresh()} disabled={loading} aria-label="تحديث القائمة">
                <span className={loading ? styles.spinning : undefined}>
                  <RefreshCw size={18} />
                </span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.sticky}>
        <div className={styles.toolbar}>
          <input
            className={styles.search}
            type="search"
            placeholder="بحث حي بالاسم أو الوصف أو رقم المنتج أو الـ slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="بحث في المنتجات"
          />
          <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="الفرز">
            <option value="new">الأحدث</option>
            <option value="price-asc">السعر ↑</option>
            <option value="price-desc">السعر ↓</option>
            <option value="popular">الأكثر شعبية (مبيعات)</option>
            <option value="name-asc">الاسم أ-ي</option>
            <option value="name-desc">الاسم ي-أ</option>
            <option value="reviews-desc">الأعلى تقييماً (مراجعات)</option>
          </select>
          <div className={styles.togglePair} role="group" aria-label="شكل العرض">
            <button
              type="button"
              className={`${styles.toggleBtn} ${view === "grid" ? styles.toggleOn : ""}`}
              onClick={() => setView("grid")}
            >
              <LayoutGrid size={16} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
              شبكة
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${view === "list" ? styles.toggleOn : ""}`}
              onClick={() => setView("list")}
            >
              <List size={16} style={{ display: "inline", verticalAlign: "middle", marginInlineEnd: 4 }} />
              قائمة
            </button>
          </div>
          <button type="button" className={styles.iconToggle} onClick={() => setDark((d) => !d)} aria-label={dark ? "وضع فاتح" : "وضع داكن"}>
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="تصفية المنتجات">
          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>استعراض الأقسام</span>
            <div className={styles.catNav}>
              <button
                type="button"
                className={`${styles.catNavItem} ${categoryId === "" ? styles.catNavItemOn : ""}`}
                onClick={() => updateCategoryInUrl("")}
              >
                <span className={styles.catNavTitle}>كل المنتجات</span>
                <span className={styles.catNavCount}>{products.length}</span>
              </button>
              {categories.map((c) => {
                const n = countsByCategory.get(c.id) ?? 0;
                return (
                  <div key={c.id} className={styles.catNavRow}>
                    <button
                      type="button"
                      className={`${styles.catNavItem} ${categoryId === c.id ? styles.catNavItemOn : ""}`}
                      onClick={() => updateCategoryInUrl(c.id)}
                    >
                      <span className={styles.catNavTitle}>{c.nameAr || c.nameEn}</span>
                      <span className={styles.catNavCount}>{n}</span>
                    </button>
                    <a
                      className={styles.catNavStore}
                      href={`/ar/products?cat=${encodeURIComponent(c.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="عرض القسم في المتجر"
                      aria-label={`متجر: ${c.nameEn}`}
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>القسم (قائمة)</span>
            <select
              className={styles.select}
              style={{ width: "100%" }}
              value={categoryId === "" ? "" : String(categoryId)}
              onChange={(e) => updateCategoryInUrl(e.target.value === "" ? "" : Number(e.target.value))}
            >
              <option value="">كل الأقسام</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} ({countsByCategory.get(c.id) ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>رقم المنتج</span>
            <input
              className={styles.search}
              dir="ltr"
              placeholder="#118 أو 118"
              value={idQuery}
              onChange={(e) => setIdQuery(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>نطاق السعر (د.ع)</span>
            <div className={styles.rangeRow}>
              <span className={styles.rangeVals}>
                {priceMin.toLocaleString("ar-IQ")} — {priceMax.toLocaleString("ar-IQ")}
              </span>
              <label className={styles.filterLabel} style={{ marginBottom: 4 }}>
                من
              </label>
              <input
                type="range"
                className={styles.range}
                min={0}
                max={maxPrice}
                step={Math.max(5000, Math.round(maxPrice / 200))}
                value={priceMin}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPriceMin(v);
                  setPriceMax((mx) => (v > mx ? v : mx));
                }}
              />
              <label className={styles.filterLabel} style={{ marginBottom: 4 }}>
                إلى
              </label>
              <input
                type="range"
                className={styles.range}
                min={0}
                max={maxPrice}
                step={Math.max(5000, Math.round(maxPrice / 200))}
                value={priceMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setPriceMax(v);
                  setPriceMin((mn) => (v < mn ? v : mn));
                }}
              />
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>التوفر</span>
            <div className={styles.chips}>
              {(
                [
                  ["all", "الكل"],
                  ["in", "متوفر"],
                  ["out", "غير متوفر"],
                ] as const
              ).map(([k, lab]) => (
                <button key={k} type="button" className={`${styles.chip} ${stock === k ? styles.chipOn : ""}`} onClick={() => setStock(k)}>
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>النشر</span>
            <div className={styles.chips}>
              {(
                [
                  ["all", "الكل"],
                  ["yes", "منشور"],
                  ["no", "مسودة"],
                ] as const
              ).map(([k, lab]) => (
                <button key={k} type="button" className={`${styles.chip} ${published === k ? styles.chipOn : ""}`} onClick={() => setPublished(k)}>
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>صور المنتج</span>
            <div className={styles.chips}>
              {(
                [
                  ["all", "الكل"],
                  ["yes", "مع صورة"],
                  ["no", "بدون صورة"],
                ] as const
              ).map(([k, lab]) => (
                <button key={k} type="button" className={`${styles.chip} ${hasImage === k ? styles.chipOn : ""}`} onClick={() => setHasImage(k)}>
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>تصفية سريعة</span>
            <div className={styles.chips}>
              <button
                type="button"
                className={`${styles.chip} ${featuredOnly ? styles.chipOn : ""}`}
                onClick={() => setFeaturedOnly((x) => !x)}
              >
                مميز فقط
              </button>
              <button type="button" className={`${styles.chip} ${saleOnly ? styles.chipOn : ""}`} onClick={() => setSaleOnly((x) => !x)}>
                تخفيضات فقط
              </button>
              <button
                type="button"
                className={`${styles.chip} ${wishlistOnly ? styles.chipOn : ""}`}
                onClick={() => setWishlistOnly((x) => !x)}
              >
                المفضلة فقط
              </button>
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>الحد الأدنى للمراجعات</span>
            <div className={styles.chips}>
              {(
                [
                  [0, "الكل"],
                  [5, "5+"],
                  [10, "10+"],
                  [25, "25+"],
                ] as const
              ).map(([v, lab]) => (
                <button
                  key={lab}
                  type="button"
                  className={`${styles.chip} ${minReviews === v ? styles.chipOn : ""}`}
                  onClick={() => setMinReviews(v)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>التقييم الأدنى</span>
            <div className={styles.chips}>
              {(
                [
                  [0, "الكل"],
                  [3, "3+"],
                  [4, "4+"],
                  [4.5, "4.5+"],
                ] as const
              ).map(([v, lab]) => (
                <button
                  key={lab}
                  type="button"
                  className={`${styles.chip} ${ratingMin === v ? styles.chipOn : ""}`}
                  onClick={() => setRatingMin(v)}
                >
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterBlock}>
            <span className={styles.filterLabel}>العلامة (نص)</span>
            <input
              className={styles.search}
              placeholder="مثال: MSI"
              value={brandQ}
              onChange={(e) => setBrandQ(e.target.value)}
              style={{ width: "100%" }}
            />
          </div>

          <button type="button" className={styles.resetFilters} onClick={resetFilters}>
            مسح كل عوامل التصفية والرابط
          </button>
        </aside>

        <div className={styles.main}>
          <p className={styles.stats}>
            عرض {slice.length} من {filtered.length} منتجاً
            {products.length !== filtered.length ? ` (من أصل ${products.length} في المتجر)` : ""}
          </p>

          {showSkeleton ? (
            <div className={styles.skeletonGrid} aria-hidden>
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className={styles.skCard} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>
              <h3>لا توجد منتجات مطابقة</h3>
              <p>جرّب تغيير البحث أو الفلاتر، أو أضف منتجاً من «إضافة منتج» أعلاه.</p>
            </div>
          ) : view === "grid" ? (
            <motion.div className={styles.grid} initial={{ opacity: 0.85 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
              {slice.map((p) => {
                const name = (p.nameAr || p.nameEn).trim() || p.nameEn;
                const storefrontUrl = `/ar/product/${p.id}`;
                const editUrl = `/admin/products/edit/${p.id}`;
                const msg = `السلام عليكم، أستفسر عن المنتج: ${name} (#${p.id})`;
                const wh = waHref(waPhone, msg);
                return (
                  <AdminProductCard
                    key={p.id}
                    product={p}
                    displayName={name}
                    view="grid"
                    wishlisted={wish.has(p.id)}
                    onToggleWishlist={() => toggleWish(p.id)}
                    onQuickView={() => setQv(p)}
                    whatsappHref={wh}
                    storefrontUrl={storefrontUrl}
                    editUrl={editUrl}
                    onPatch={patchProduct}
                    onDelete={deleteProduct}
                    busy={mutatingId === p.id}
                  />
                );
              })}
            </motion.div>
          ) : (
            <div className={styles.list}>
              {slice.map((p) => {
                const name = (p.nameAr || p.nameEn).trim() || p.nameEn;
                const storefrontUrl = `/ar/product/${p.id}`;
                const editUrl = `/admin/products/edit/${p.id}`;
                const msg = `السلام عليكم، أستفسر عن المنتج: ${name} (#${p.id})`;
                const wh = waHref(waPhone, msg);
                return (
                  <AdminProductCard
                    key={p.id}
                    product={p}
                    displayName={name}
                    view="list"
                    wishlisted={wish.has(p.id)}
                    onToggleWishlist={() => toggleWish(p.id)}
                    onQuickView={() => setQv(p)}
                    whatsappHref={wh}
                    storefrontUrl={storefrontUrl}
                    editUrl={editUrl}
                    onPatch={patchProduct}
                    onDelete={deleteProduct}
                    busy={mutatingId === p.id}
                  />
                );
              })}
            </div>
          )}

          {pageCount > 1 && !showSkeleton && filtered.length > 0 ? (
            <div className={styles.pagination}>
              <button type="button" className={styles.pageBtn} disabled={currentPage <= 1} onClick={() => setPage(1)}>
                الأولى
              </button>
              <button type="button" className={styles.pageBtn} disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                السابق
              </button>
              <span className={styles.stats} style={{ marginInline: 4 }}>
                {currentPage} / {pageCount}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                التالي
              </button>
              <button type="button" className={styles.pageBtn} disabled={currentPage >= pageCount} onClick={() => setPage(pageCount)}>
                الأخيرة
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <AnimatePresence>
        {qv ? (
          <motion.div key={qv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <AdminProductQuickView
              product={qv}
              displayName={(qv.nameAr || qv.nameEn).trim() || qv.nameEn}
              displayDescFull={(qv.descAr || qv.descEn).trim()}
              storefrontUrl={`/ar/product/${qv.id}`}
              editUrl={`/admin/products/edit/${qv.id}`}
              onClose={() => setQv(null)}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
