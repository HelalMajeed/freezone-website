"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { FacetAttributeDef } from "@/lib/data";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { facetAttributeDisplayName } from "@/lib/facet-attributes";
import { fetchAdminProductsList } from "@/lib/admin/admin-products-api";
import { AdminProductsTable } from "@/components/admin/products/AdminProductsTable";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminLoadingState } from "@/components/admin/ui/AdminLoadingState";
import { freezoneApiUrl } from "@/lib/api-internal";
import type { AdminProductRow } from "@/components/admin/products-catalog/admin-product-types";
import type { AdminCategoryRow } from "@/components/admin/categories/AdminCategoriesManager";
import styles from "./AdminCategoryHub.module.css";

export type CategoryHubTab = "overview" | "products" | "filters" | "display" | "settings" | "quality";

const TAB_LABELS: Record<CategoryHubTab, string> = {
  overview: "نظرة عامة",
  products: "منتجات القسم",
  filters: "الفلاتر",
  display: "مواصفات العرض",
  settings: "إعدادات القسم",
  quality: "جودة البيانات",
};

function parseTab(raw: string | null): CategoryHubTab {
  const t = (raw ?? "overview") as CategoryHubTab;
  return t in TAB_LABELS ? t : "overview";
}

export function AdminCategoryHub() {
  const navigate = useNavigate();
  const params = useParams();
  const categoryId = parseInt(params.id ?? "", 10);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = parseTab(searchParams.get("tab"));

  const [category, setCategory] = useState<AdminCategoryRow | null>(null);
  const [attributes, setAttributes] = useState<FacetAttributeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [productTotal, setProductTotal] = useState(0);
  const [publishedCount, setPublishedCount] = useState(0);
  const [qualityIssues, setQualityIssues] = useState<
    { productId: number; nameEn: string; issue: string; tab: string }[]
  >([]);
  const [recentProducts, setRecentProducts] = useState<AdminProductRow[]>([]);
  const [stockUnsetCount, setStockUnsetCount] = useState(0);
  const [missingImagesCount, setMissingImagesCount] = useState(0);
  const [missingSpecsCount, setMissingSpecsCount] = useState(0);

  const load = useCallback(async () => {
    if (!Number.isFinite(categoryId)) return;
    setLoading(true);
    const listBase = {
      categoryId: String(categoryId),
      search: "",
      published: "" as const,
      stock: "" as const,
      sort: "id_desc",
    };
    const [catRes, attrRes, prodRes, pubRes, unsetRes, recentRes] = await Promise.all([
      fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include", cache: "no-store" }),
      fetch(freezoneApiUrl(`/api/admin/categories/${categoryId}/attributes`), {
        credentials: "include",
        cache: "no-store",
      }),
      fetchAdminProductsList({ ...listBase, page: 1, pageSize: 1 }),
      fetchAdminProductsList({
        ...listBase,
        page: 1,
        pageSize: 1,
        published: "published",
      }),
      fetchAdminProductsList({
        ...listBase,
        page: 1,
        pageSize: 1,
        stock: "unset",
      }),
      fetchAdminProductsList({ ...listBase, page: 1, pageSize: 5 }),
    ]);
    if (catRes.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    let slug = "";
    if (catRes.ok) {
      const cats = (await catRes.json()) as AdminCategoryRow[];
      const cat = cats.find((c) => c.id === categoryId) ?? null;
      setCategory(cat);
      slug = cat?.slug ?? "";
    }
    if (attrRes.ok) {
      const data = (await attrRes.json()) as { categoryAttributes: FacetAttributeDef[] };
      setAttributes(data.categoryAttributes ?? []);
    }
    setProductTotal(prodRes.total);
    setPublishedCount(pubRes.total);
    setStockUnsetCount(unsetRes.total);
    setRecentProducts(recentRes.items);

    const issues: { productId: number; nameEn: string; issue: string; tab: string }[] = [];
    let missImg = 0;
    let missSpec = 0;
    if (slug) {
      for (const qTab of ["missing_images", "missing_specs", "invalid_filters"] as const) {
        const res = await fetch(
          freezoneApiUrl(`/api/admin/data-quality?tab=${qTab}&page=1&limit=50`),
          { credentials: "include" },
        );
        if (res.ok) {
          const j = (await res.json()) as {
            items: { productId: number; nameEn: string; categorySlug: string; issue: string }[];
          };
          for (const item of j.items ?? []) {
            if (item.categorySlug === slug) {
              issues.push({ productId: item.productId, nameEn: item.nameEn, issue: item.issue, tab: qTab });
              if (qTab === "missing_images") missImg++;
              if (qTab === "missing_specs") missSpec++;
            }
          }
        }
      }
    }
    setMissingImagesCount(missImg);
    setMissingSpecsCount(missSpec);
    setQualityIssues(issues);
    setLoading(false);
  }, [categoryId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const { filterableSpecs, extendedSpecs } = useMemo(
    () => partitionFacetAttributes(attributes),
    [attributes],
  );

  const categoryName = category?.nameAr || category?.nameEn || "—";
  const storeUrl = category?.slug ? `/ar/category/${category.slug}` : "/ar";

  function setTab(next: CategoryHubTab) {
    const sp = new URLSearchParams(searchParams);
    sp.set("tab", next);
    setSearchParams(sp, { replace: true });
  }

  if (!Number.isFinite(categoryId)) {
    return <p style={{ color: "var(--admin-muted)" }}>معرّف قسم غير صالح.</p>;
  }

  if (loading && !category) {
    return <AdminLoadingState message="جاري تحميل القسم…" />;
  }

  if (!category) {
    return (
      <div>
        <p>القسم غير موجود.</p>
        <Link to="/admin/categories">← الأقسام</Link>
      </div>
    );
  }

  const categoryOptions = [
    { id: category.id, nameEn: category.nameEn, nameAr: category.nameAr, slug: category.slug },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.breadcrumb}>
        <Link to="/admin/categories">الأقسام</Link>
        <span>/</span>
        <span>{categoryName}</span>
      </div>

      <AdminPageHeader
        title={categoryName}
        description={`إدارة كتالوج القسم — ${category.slug}`}
        actions={
          <div className={styles.headerActions}>
            <Link className={styles.btnPrimary} to={`/admin/categories/${categoryId}/products/new`}>
              + إضافة منتج
            </Link>
            <a className={styles.btnGhost} href={storeUrl} target="_blank" rel="noopener noreferrer">
              عرض في المتجر
            </a>
          </div>
        }
      />

      <p className={styles.explain}>
        منتجات هذا القسم تظهر في صفحة القسم للمستخدم. <strong>الفلاتر</strong> تتحكم في الشريط الجانبي.{" "}
        <strong>مواصفات العرض</strong> داخل صفحة المنتج. الصور والسعر في البطاقة وصفحة المنتج.
      </p>

      <nav className={styles.tabs} aria-label="أقسام إدارة القسم">
        {(Object.keys(TAB_LABELS) as CategoryHubTab[]).map((id) => (
          <button
            key={id}
            type="button"
            className={tab === id ? styles.tabActive : styles.tab}
            onClick={() => setTab(id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </nav>

      {tab === "overview" ? (
        <section className={styles.panel}>
          <p className={styles.help} dir="ltr" style={{ marginTop: 0 }}>
            Slug: <strong>{category.slug}</strong>
          </p>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>المنتجات</span>
              <strong>{productTotal}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>منشور</span>
              <strong>{publishedCount}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>بدون صور</span>
              <strong>{missingImagesCount}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>مواصفات ناقصة</span>
              <strong>{missingSpecsCount}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>مخزون غير محدد</span>
              <strong>{stockUnsetCount}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>فلاتر</span>
              <strong>{filterableSpecs.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>مواصفات عرض</span>
              <strong>{extendedSpecs.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>مشاكل جودة (عينة)</span>
              <strong>{qualityIssues.length}</strong>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>الحالة</span>
              <strong>{category.active !== false ? "نشط" : "معطّل"}</strong>
            </div>
          </div>
          {recentProducts.length > 0 ? (
            <>
              <h3 style={{ margin: "16px 0 10px", fontSize: "1rem" }}>آخر المنتجات المعدّلة</h3>
              <table className={styles.attrTable}>
                <thead>
                  <tr>
                    <th>المنتج</th>
                    <th>SKU</th>
                    <th>إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {recentProducts.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nameAr || p.nameEn}</td>
                      <td dir="ltr">{p.sku}</td>
                      <td>
                        <Link to={`/admin/products/edit/${p.id}`}>تعديل</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : null}
          <div className={styles.quickActions}>
            <button type="button" className={styles.btnGhost} onClick={() => setTab("products")}>
              عرض المنتجات
            </button>
            <button type="button" className={styles.btnGhost} onClick={() => setTab("filters")}>
              إدارة الفلاتر
            </button>
            <Link className={styles.btnGhost} to={`/admin/categories/${categoryId}/products/new`}>
              إضافة منتج
            </Link>
          </div>
        </section>
      ) : null}

      {tab === "products" ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2>منتجات القسم</h2>
            <Link className={styles.btnPrimary} to={`/admin/categories/${categoryId}/products/new`}>
              إضافة منتج داخل هذا القسم
            </Link>
          </div>
          <AdminProductsTable categories={categoryOptions} lockedCategoryId={categoryId} />
        </section>
      ) : null}

      {tab === "filters" ? (
        <section className={styles.panel}>
          <p className={styles.help}>
            هذه السمات تظهر في فلاتر صفحة القسم (Sidebar). للتعديل الكامل استخدم محرر السمات.
          </p>
          <table className={styles.attrTable}>
            <thead>
              <tr>
                <th>الفلتر</th>
                <th>key</th>
                <th>النوع</th>
                <th>الترتيب</th>
              </tr>
            </thead>
            <tbody>
              {filterableSpecs.map((a) => (
                <tr key={a.key}>
                  <td>{facetAttributeDisplayName(a, "ar")}</td>
                  <td dir="ltr">{a.key}</td>
                  <td>{a.type ?? "SELECT"}</td>
                  <td>—</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filterableSpecs.length === 0 ? (
            <p style={{ color: "var(--admin-muted)" }}>لا توجد فلاتر — أضف سمات قابلة للفلترة.</p>
          ) : null}
          <Link className={styles.btnGhost} to={`/admin/categories/${categoryId}/attributes`} style={{ marginTop: 12 }}>
            محرر السمات المتقدم
          </Link>
        </section>
      ) : null}

      {tab === "display" ? (
        <section className={styles.panel}>
          <p className={styles.help}>تظهر داخل صفحة المنتج فقط — وليس في فلاتر الكتالوج.</p>
          <table className={styles.attrTable}>
            <thead>
              <tr>
                <th>المواصفة</th>
                <th>key</th>
                <th>المجموعة</th>
                <th>مطلوب؟</th>
              </tr>
            </thead>
            <tbody>
              {extendedSpecs.map((a) => (
                <tr key={a.key}>
                  <td>{facetAttributeDisplayName(a, "ar")}</td>
                  <td dir="ltr">{a.key}</td>
                  <td>{a.displayGroup ?? "—"}</td>
                  <td>{a.required ? "نعم" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link className={styles.btnGhost} to={`/admin/categories/${categoryId}/attributes`} style={{ marginTop: 12 }}>
            محرر السمات المتقدم
          </Link>
        </section>
      ) : null}

      {tab === "settings" ? (
        <section className={styles.panel}>
          <dl className={styles.metaList}>
            <dt>الاسم (EN)</dt>
            <dd>{category.nameEn}</dd>
            <dt>الاسم (AR)</dt>
            <dd>{category.nameAr}</dd>
            <dt>Slug</dt>
            <dd dir="ltr">{category.slug}</dd>
            <dt>الترتيب</dt>
            <dd>{category.sortOrder}</dd>
          </dl>
          <Link className={styles.btnGhost} to="/admin/categories">
            تعديل من قائمة الأقسام
          </Link>
        </section>
      ) : null}

      {tab === "quality" ? (
        <section className={styles.panel}>
          <p className={styles.help}>مشاكل مرتبطة بمنتجات هذا القسم (عينة من جودة البيانات العامة).</p>
          {qualityIssues.length === 0 ? (
            <p style={{ color: "var(--admin-muted)" }}>لا توجد مشاكل ظاهرة في العينة الحالية.</p>
          ) : (
            <table className={styles.attrTable}>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المشكلة</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {qualityIssues.map((row) => (
                  <tr key={`${row.productId}-${row.tab}`}>
                    <td>{row.nameEn}</td>
                    <td>{row.issue}</td>
                    <td>
                      <Link to={`/admin/products/edit/${row.productId}`}>تعديل المنتج</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Link className={styles.btnGhost} to="/admin/data-quality" style={{ marginTop: 12 }}>
            جودة البيانات (كل الأقسام)
          </Link>
        </section>
      ) : null}

    </div>
  );
}
