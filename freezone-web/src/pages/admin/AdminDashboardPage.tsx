"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Package,
  FolderTree,
  AlertTriangle,
  Plus,
  ExternalLink,
  RefreshCw,
  ImageOff,
  Filter,
  FileWarning,
  Store,
  RefreshCcw,
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
        description="نظرة عامة على المتجر، جودة البيانات، والكتالوج. كل الأقسام مرتبة تحت قائمة جانبية واحدة."
        actions={
          <>
            <span className={ui.envBadge}>Production API</span>
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
            <Link className={ui.btnSm} to="/admin/products/new" style={{ borderColor: "var(--admin-accent)", color: "var(--admin-accent)" }}>
              <Plus size={14} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
              منتج جديد
            </Link>
          </>
        }
      />

      {apiDown && (
        <div className={ui.alertItem + " " + ui.alertError} style={{ marginBottom: 16 }}>
          تعذّر تحميل البيانات. تأكد من تشغيل API على {freezoneApiUrl("")}
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
          <div className={ui.statGrid}>
            <AdminStatCard label="إجمالي المنتجات" value={stats.totalProducts} href="/admin/products" />
            <AdminStatCard label="منشور" value={stats.publishedProducts} hint="Published" />
            <AdminStatCard label="مسودة" value={stats.draftProducts} />
            <AdminStatCard label="غير متوفر" value={stats.outOfStockProducts} tone={stats.outOfStockProducts > 0 ? "warn" : "default"} />
            <AdminStatCard label="أقسام" value={stats.categoriesCount} href="/admin/categories" />
            <AdminStatCard label="علامات" value={stats.brandsCount} href="/admin/brands" />
            <AdminStatCard
              label="مواصفات ناقصة"
              value={stats.productsMissingSpecs}
              href="/admin/data-quality?tab=missing_specs"
              tone={stats.productsMissingSpecs > 0 ? "warn" : "default"}
            />
            <AdminStatCard
              label="فلاتر غير صالحة"
              value={stats.invalidFilterValues}
              href="/admin/data-quality?tab=invalid_filters"
              tone={stats.invalidFilterValues > 0 ? "error" : "default"}
            />
            <AdminStatCard
              label="بدون صور"
              value={stats.productsMissingImages}
              href="/admin/data-quality?tab=missing_images"
              tone={stats.productsMissingImages > 0 ? "warn" : "default"}
            />
            <AdminStatCard label="طلبات معلّقة" value={stats.pendingOrders} href="/admin/orders" />
          </div>

          {d?.warnings?.length ? (
            <AdminSectionCard title="تنبيهات جودة البيانات">
              <AdminAlertPanel alerts={d.warnings} />
            </AdminSectionCard>
          ) : null}

          <AdminSectionCard title="إجراءات سريعة">
            <div className={ui.quickGrid}>
              <Link to="/admin/products/new" className={ui.quickAction}>
                <Plus size={20} />
                إضافة منتج
              </Link>
              <Link to="/admin/products" className={ui.quickAction}>
                <Package size={20} />
                المنتجات
              </Link>
              <Link to="/admin/categories" className={ui.quickAction}>
                <FolderTree size={20} />
                الأقسام
              </Link>
              <Link to="/admin/data-quality" className={ui.quickAction}>
                <FileWarning size={20} />
                جودة البيانات
              </Link>
              <Link to="/admin/classification" className={ui.quickAction}>
                <Filter size={20} />
                أدوات التصنيف
              </Link>
              <Link to="/admin/classification" className={ui.quickAction}>
                <RefreshCcw size={20} />
                مزامنة المواصفات
              </Link>
              <Link to="/" target="_blank" rel="noopener noreferrer" className={ui.quickAction}>
                <Store size={20} />
                عرض المتجر
              </Link>
              <Link to="/admin/media" className={ui.quickAction}>
                <ImageOff size={20} />
                الوسائط
              </Link>
            </div>
          </AdminSectionCard>

          <AdminSectionCard title="آخر المنتجات المحدّثة">
            {!d?.recentProducts?.length ? (
              <AdminEmptyState title="لا منتجات بعد" message="أضف أول منتج من إجراءات سريعة." />
            ) : (
              <div className={ui.tableWrap}>
                <table className={ui.table}>
                  <thead>
                    <tr>
                      <th>المنتج</th>
                      <th>القسم</th>
                      <th>الحالة</th>
                      <th>آخر تحديث</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {d.recentProducts.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <strong>#{p.id}</strong> {p.nameEn}
                        </td>
                        <td>{p.categoryName}</td>
                        <td>
                          <AdminBadge variant={p.published ? "ok" : "muted"}>
                            {p.published ? "منشور" : "مسودة"}
                          </AdminBadge>{" "}
                          <AdminBadge variant={p.inStock ? "ok" : "warn"}>
                            {p.inStock ? "متوفر" : "نفد"}
                          </AdminBadge>
                        </td>
                        <td>{formatDate(p.updatedAt)}</td>
                        <td>
                          <Link className={ui.btnSm} to={`/admin/products/edit/${p.id}`}>
                            تعديل
                          </Link>
                        </td>
                      </tr>
                    ))}
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
                    <th>سمات</th>
                    <th>فلاتر</th>
                    <th>مواصفات عرض</th>
                    <th>ناقص مواصفات</th>
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
                      <td>{c.attributeCount}</td>
                      <td>{c.filterableAttributes}</td>
                      <td>{c.displaySpecAttributes}</td>
                      <td>
                        {c.productsMissingSpecs > 0 ? (
                          <AdminBadge variant="warn">{c.productsMissingSpecs}</AdminBadge>
                        ) : (
                          <AdminBadge variant="ok">0</AdminBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSectionCard>
        </>
      ) : null}

      <p style={{ fontSize: "0.8rem", color: "var(--admin-muted)", marginTop: 24 }}>
        <AlertTriangle size={14} style={{ verticalAlign: "middle", marginInlineEnd: 4 }} />
        لا تشغّل <code>prisma db seed</code> من الإنتاج. إصلاح الفلاتر عبر{" "}
        <Link to="/admin/classification">أدوات التصنيف</Link> فقط بعد dry-run.
      </p>
    </div>
  );
}
