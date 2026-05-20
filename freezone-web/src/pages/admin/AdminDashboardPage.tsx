"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  CheckCircle2,
  FileEdit,
  PackageX,
  HelpCircle,
  FolderTree,
  Tag,
  ImageOff,
  Filter,
  FileWarning,
  ExternalLink,
  RefreshCw,
  ShoppingCart,
} from "lucide-react";
import { freezoneApiUrl } from "@/lib/api-internal";
import { isDatabaseConfigured } from "@/lib/prisma";
import { fetchAdminDashboard } from "@/lib/admin/admin-dashboard-api";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/ui/AdminStatCard";
import { AdminSectionCard } from "@/components/admin/ui/AdminSectionCard";
import { AdminBadge } from "@/components/admin/ui/AdminBadge";
import { AdminAlertPanel } from "@/components/admin/ui/AdminAlertPanel";
import { AdminEmptyState } from "@/components/admin/ui/AdminEmptyState";
import ui from "@/components/admin/ui/AdminUi.module.css";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function stockLabel(inStock: boolean, quantity?: number): { label: string; variant: "ok" | "warn" | "muted" } {
  if (!inStock) return { label: "غير متوفر", variant: "warn" };
  if (quantity != null && quantity <= 0) return { label: "مخزون غير محدد", variant: "muted" };
  return { label: "متوفر", variant: "ok" };
}

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: isDatabaseConfigured(),
    queryFn: fetchAdminDashboard,
    staleTime: 60_000,
  });

  const d = q.data;
  const stats = d?.stats;
  const loading = q.isLoading;
  const apiDown = q.isError;

  return (
    <div className={ui.page}>
      <AdminPageHeader
        title="لوحة التحكم"
        description="نظرة عامة على المتجر وجودة الكتالوج"
        actions={
          <>
            <button
              type="button"
              className={ui.btnSm}
              onClick={() => void qc.invalidateQueries({ queryKey: ["admin-dashboard"] })}
              disabled={loading}
            >
              <RefreshCw size={14} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
              تحديث
            </button>
            <Link className={ui.btnSm} to="/" target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
              عرض المتجر
            </Link>
          </>
        }
      />

      {apiDown && (
        <div className={`${ui.alertItem} ${ui.alertError}`} style={{ marginBottom: 16 }}>
          تعذّر تحميل البيانات. تأكد من تشغيل API الإنتاج على {freezoneApiUrl("")}
        </div>
      )}

      {loading ? (
        <div className={ui.statGrid}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={ui.skeleton} />
          ))}
        </div>
      ) : stats ? (
        <>
          <h3 className={ui.sectionHeading}>نظرة على المتجر</h3>
          <div className={ui.statGrid}>
            <AdminStatCard
              icon={Package}
              label="إجمالي المنتجات"
              value={stats.totalProducts}
              subtitle="كل المنتجات في الكتالوج"
              href="/admin/products"
              actionLabel="عرض المنتجات"
            />
            <AdminStatCard
              icon={CheckCircle2}
              label="منشور"
              value={stats.publishedProducts}
              subtitle="ظاهر في المتجر"
              href="/admin/products?published=true"
              actionLabel="عرض المنشور"
            />
            <AdminStatCard
              icon={FileEdit}
              label="مسودة"
              value={stats.draftProducts}
              subtitle="غير منشور بعد"
              href="/admin/products?published=false"
              actionLabel="عرض المسودات"
            />
            <AdminStatCard
              icon={PackageX}
              label="غير متوفر"
              value={stats.outOfStockProducts}
              subtitle="علامة inStock = لا"
              href="/admin/products?stock=out"
              tone={stats.outOfStockProducts > 0 ? "warn" : "default"}
              actionLabel="مراجعة"
            />
            {stats.stockNotSetProducts > 0 ? (
              <AdminStatCard
                icon={HelpCircle}
                label="مخزون غير محدد"
                value={stats.stockNotSetProducts}
                subtitle="inStock نعم لكن الكمية 0"
                href="/admin/products?stock=unset"
                tone="warn"
                actionLabel="مراجعة"
              />
            ) : null}
            <AdminStatCard
              icon={FolderTree}
              label="أقسام"
              value={stats.categoriesCount}
              subtitle="أقسام نشطة"
              href="/admin/categories"
              actionLabel="إدارة الأقسام"
            />
            <AdminStatCard
              icon={Tag}
              label="علامات"
              value={stats.brandsCount}
              subtitle="علامات تجارية"
              href="/admin/brands"
              actionLabel="عرض العلامات"
            />
          </div>

          <h3 className={ui.sectionHeading}>يتطلب إجراء</h3>
          <div className={ui.statGrid}>
            <AdminStatCard
              icon={ImageOff}
              label="بدون صور"
              value={stats.productsMissingImages}
              subtitle="منتجات بلا صورة رئيسية"
              href="/admin/data-quality?tab=missing_images"
              tone={stats.productsMissingImages > 0 ? "warn" : "default"}
              actionLabel="مراجعة"
            />
            <AdminStatCard
              icon={Filter}
              label="فلاتر غير صالحة"
              value={stats.invalidFilterValues}
              subtitle="قيم فلترة تحتاج إصلاح"
              href="/admin/data-quality?tab=invalid_filters"
              tone={stats.invalidFilterValues > 0 ? "error" : "default"}
              actionLabel="مراجعة"
            />
            <AdminStatCard
              icon={FileWarning}
              label="مواصفات ناقصة"
              value={stats.productsMissingSpecs}
              subtitle="فلاتر أو مواصفات عرض ناقصة"
              href="/admin/data-quality?tab=missing_specs"
              tone={stats.productsMissingSpecs > 0 ? "warn" : "default"}
              actionLabel="مراجعة"
            />
            {(stats.categoriesWithoutAttributes ?? 0) > 0 ? (
              <AdminStatCard
                icon={FolderTree}
                label="أقسام بلا سمات"
                value={stats.categoriesWithoutAttributes}
                subtitle="تحتاج تعريف CategoryAttribute"
                href="/admin/data-quality?tab=categories_without_attributes"
                tone="warn"
                actionLabel="مراجعة"
              />
            ) : null}
            {(stats.productsLegacySpecsOnly ?? 0) > 0 ? (
              <AdminStatCard
                icon={FileWarning}
                label="مواصفات Legacy"
                value={stats.productsLegacySpecsOnly}
                subtitle="JSON قديم بدون EAV"
                href="/admin/data-quality?tab=legacy_specs"
                tone="warn"
                actionLabel="مراجعة"
              />
            ) : null}
            {stats.pendingOrders > 0 ? (
              <AdminStatCard
                icon={ShoppingCart}
                label="طلبات معلّقة"
                value={stats.pendingOrders}
                subtitle="بانتظار التأكيد"
                href="/admin/orders?status=pending"
                tone="warn"
                actionLabel="عرض الطلبات"
              />
            ) : null}
          </div>

          {d?.warnings?.length ? (
            <AdminSectionCard title="تنبيهات جودة البيانات">
              <AdminAlertPanel alerts={d.warnings} />
            </AdminSectionCard>
          ) : null}

          <AdminSectionCard
            title="كيف يؤثر الإدارة على المتجر"
            action={
              <Link className={ui.btnSm} to="/admin/data-quality">
                جودة البيانات
              </Link>
            }
          >
            <ul className={ui.impactList}>
              <li>
                <strong>المنتجات</strong> — الاسم، السعر، الصورة، والمخزون تظهر في بطاقات المنتج وصفحة التفاصيل.
              </li>
              <li>
                <strong>قيم الفلتر (Filter Values)</strong> — تظهر في صفحة القسم والفلاتر الجانبية فقط، وليس كبديل لمواصفات
                العرض في صفحة المنتج.
              </li>
              <li>
                <strong>مواصفات العرض (Display Specs)</strong> — تظهر داخل صفحة المنتج فقط.
              </li>
              <li>
                <strong>الأقسام والسمات</strong> — السمات القابلة للفلترة تؤثر على فلاتر صفحة القسم؛ السمات غير القابلة
                للفلترة لا تظهر في الشريط الجانبي.
              </li>
              <li>
                <strong>بناء الصفحة الرئيسية</strong> — يؤثر على الصفحة الرئيسية وأقسام المحتوى فقط.
              </li>
            </ul>
          </AdminSectionCard>

          <AdminSectionCard
            title="آخر المنتجات المحدّثة"
            action={
              <Link className={ui.btnSm} to="/admin/products">
                كل المنتجات
              </Link>
            }
          >
            {!d?.recentProducts?.length ? (
              <AdminEmptyState title="لا منتجات بعد" message="أضف أول منتج من زر «إضافة منتج» أعلاه." />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>صورة</th>
                      <th>المنتج</th>
                      <th>القسم</th>
                      <th>الحالة</th>
                      <th>المخزون</th>
                      <th>آخر تحديث</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentProducts.map((p) => {
                      const stock = stockLabel(p.inStock);
                      return (
                        <tr key={p.id}>
                          <td>
                            {p.imageUrl ? (
                              <img src={p.imageUrl} alt="" className={ui.tableThumb} />
                            ) : (
                              <span className={ui.tableThumbPlaceholder}>—</span>
                            )}
                          </td>
                          <td>
                            <strong>#{p.id}</strong> {p.nameAr || p.nameEn}
                          </td>
                          <td>{p.categoryName}</td>
                          <td>
                            <AdminBadge variant={p.published ? "ok" : "muted"}>
                              {p.published ? "منشور" : "مسودة"}
                            </AdminBadge>
                          </td>
                          <td>
                            <AdminBadge variant={stock.variant}>{stock.label}</AdminBadge>
                          </td>
                          <td>{formatDate(p.updatedAt)}</td>
                          <td>
                            <Link className={ui.btnSm} to={`/admin/products/edit/${p.id}`}>
                              تعديل
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </AdminSectionCard>

          <AdminSectionCard title="صحة الكتالوج حسب القسم">
            <div className={ui.tableWrap}>
              <table className={ui.table}>
                <thead>
                  <tr>
                    <th>القسم</th>
                    <th>منتجات</th>
                    <th>سمات فلترة</th>
                    <th>مواصفات عرض</th>
                    <th>مشاكل</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {d?.categoryHealth?.map((c) => (
                    <tr key={c.categoryId}>
                      <td>
                        <Link to={`/admin/categories/${c.categoryId}/attributes`}>{c.name}</Link>
                        <div style={{ fontSize: "0.75rem", color: "var(--admin-muted)" }}>{c.slug}</div>
                      </td>
                      <td>{c.productCount}</td>
                      <td>{c.filterableAttributes}</td>
                      <td>{c.displaySpecAttributes}</td>
                      <td>
                        {c.productsMissingSpecs > 0 ? (
                          <AdminBadge variant="warn">{c.productsMissingSpecs} مواصفات ناقصة</AdminBadge>
                        ) : (
                          <AdminBadge variant="ok">سليم</AdminBadge>
                        )}
                      </td>
                      <td>
                        <Link className={ui.btnSm} to={`/admin/categories/${c.categoryId}/attributes`}>
                          إدارة
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSectionCard>
        </>
      ) : null}
    </div>
  );
}
