"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { isDatabaseConfigured } from "@/lib/prisma";
import { fetchAdminDashboard } from "@/lib/admin/admin-dashboard-api";
import { Badge, Card, Button } from "@/components/dashboard/ui";
import dashUi from "@/components/dashboard/ui/ui.module.css";
import s from "./AdminDashboardOverview.module.css";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-IQ", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function stockLabel(inStock: boolean): { label: string; tone: "success" | "warning" | "neutral" } {
  if (!inStock) return { label: "غير متوفر", tone: "warning" };
  return { label: "متوفر", tone: "success" };
}

function Kpi({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number | string;
  href: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Link to={href} className={dashUi.kpi} style={{ textDecoration: "none" }}>
      <div className={dashUi.kpiLabel}>{label}</div>
      <div
        className={dashUi.kpiValue}
        style={
          tone === "warning"
            ? { color: "var(--fz-warning)" }
            : tone === "danger"
              ? { color: "var(--fz-danger)" }
              : undefined
        }
      >
        {value}
      </div>
    </Link>
  );
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

  if (loading) return <div className="dashboard-loader" />;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">لوحة التحكم</h1>
          <div className="dashboard-page-subtitle">نظرة عامة على المتجر وجودة الكتالوج</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void qc.invalidateQueries({ queryKey: ["admin-dashboard"] })}
          >
            تحديث
          </Button>
          <Link to="/" target="_blank" rel="noopener noreferrer" className={`${dashUi.btn} ${dashUi.btnGhost} ${dashUi.btnSm}`}>
            عرض المتجر
          </Link>
          <Link to="/admin/categories" className={`${dashUi.btn} ${dashUi.btnPrimary} ${dashUi.btnSm}`}>
            إضافة من قسم
          </Link>
        </div>
      </div>

      {apiDown && (
        <Card title="تعذّر تحميل البيانات">
          <p style={{ margin: 0, color: "var(--fz-danger)" }}>
            تأكد من تشغيل API على {freezoneApiUrl("")}
          </p>
        </Card>
      )}

      {stats ? (
        <>
          <div className={dashUi.kpiGrid}>
            <Kpi label="إجمالي المنتجات" value={stats.totalProducts} href="/admin/products" />
            <Kpi label="منشور" value={stats.publishedProducts} href="/admin/products?published=true" />
            <Kpi label="مسودة" value={stats.draftProducts} href="/admin/products?published=false" />
            <Kpi
              label="غير متوفر"
              value={stats.outOfStockProducts}
              href="/admin/products?stock=out"
              tone={stats.outOfStockProducts > 0 ? "warning" : undefined}
            />
            {stats.stockNotSetProducts > 0 ? (
              <Kpi
                label="مخزون غير محدد"
                value={stats.stockNotSetProducts}
                href="/admin/products?stock=unset"
                tone="warning"
              />
            ) : null}
            <Kpi label="أقسام" value={stats.categoriesCount} href="/admin/categories" />
            <Kpi label="علامات" value={stats.brandsCount} href="/admin/brands" />
          </div>

          <h3 style={{ margin: "28px 0 12px", fontSize: 15, fontWeight: 700 }}>يتطلب إجراء</h3>
          <div className={dashUi.kpiGrid}>
            <Kpi
              label="صور ناقصة"
              value={stats.productsMissingImages}
              href="/admin/data-quality?tab=missing_images"
              tone={stats.productsMissingImages > 0 ? "warning" : undefined}
            />
            <Kpi
              label="فلاتر غير صالحة"
              value={stats.invalidFilterValues}
              href="/admin/data-quality?tab=invalid_filters"
              tone={stats.invalidFilterValues > 0 ? "danger" : undefined}
            />
            <Kpi
              label="مواصفات ناقصة"
              value={stats.productsMissingSpecs}
              href="/admin/data-quality?tab=missing_specs"
              tone={stats.productsMissingSpecs > 0 ? "warning" : undefined}
            />
            {(stats.categoriesWithoutAttributes ?? 0) > 0 ? (
              <Kpi
                label="أقسام بلا سمات"
                value={stats.categoriesWithoutAttributes}
                href="/admin/data-quality?tab=categories_without_attributes"
                tone="warning"
              />
            ) : null}
            {stats.pendingOrders > 0 ? (
              <Kpi label="طلبات معلّقة" value={stats.pendingOrders} href="/admin/orders?status=pending" tone="warning" />
            ) : null}
          </div>

          <div className={dashUi.twoCol} style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card
                title="أولويات اليوم"
                action={
                  <Link to="/admin/data-quality" style={{ fontSize: 12, color: "var(--fz-brand)" }}>
                    جودة البيانات
                  </Link>
                }
              >
                {d?.warnings?.length ? (
                  <ul style={{ margin: 0, paddingInlineStart: 18, color: "var(--fz-text-soft)" }}>
                    {d.warnings.map((w, i) => (
                      <li key={i} style={{ marginBottom: 8 }}>
                        {w.href ? (
                          <Link to={w.href} style={{ color: "var(--fz-brand)" }}>
                            {w.message}
                          </Link>
                        ) : (
                          w.message
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: "var(--fz-text-muted)" }}>لا توجد تنبيهات عاجلة.</p>
                )}
              </Card>

              <Card
                title="آخر المنتجات"
                action={
                  <Link to="/admin/products" style={{ fontSize: 12, color: "var(--fz-brand)" }}>
                    كل المنتجات
                  </Link>
                }
              >
                {!d?.recentProducts?.length ? (
                  <p className={dashUi.empty}>لا منتجات بعد — ابدأ من الأقسام.</p>
                ) : (
                  d.recentProducts.map((p) => {
                    const stock = stockLabel(p.inStock);
                    return (
                      <div className={s.productRow} key={p.id}>
                        <div className={s.productThumb}>
                          {p.imageUrl ? <img src={p.imageUrl} alt="" /> : "—"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className={s.productName}>
                            #{p.id} {p.nameAr || p.nameEn}
                          </div>
                          <div className={s.productMeta}>
                            {p.categoryName} · {formatDate(p.updatedAt)}
                          </div>
                        </div>
                        <Badge tone={p.published ? "success" : "neutral"}>
                          {p.published ? "منشور" : "مسودة"}
                        </Badge>
                        <Badge tone={stock.tone}>{stock.label}</Badge>
                        <Link to={`/admin/products/edit/${p.id}`} style={{ fontSize: 12, color: "var(--fz-brand)" }}>
                          تعديل
                        </Link>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card title="صحة الكتالوج حسب القسم">
                <div className={dashUi.tableWrap}>
                  <table className={dashUi.table}>
                    <thead>
                      <tr>
                        <th>القسم</th>
                        <th>منتجات</th>
                        <th>فلاتر</th>
                        <th>عرض</th>
                        <th>مشاكل</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {d?.categoryHealth?.map((c) => (
                        <tr key={c.categoryId}>
                          <td>
                            <Link to={`/admin/categories/${c.categoryId}`} style={{ fontWeight: 600 }}>
                              {c.name}
                            </Link>
                            <div style={{ fontSize: 11, color: "var(--fz-text-muted)" }}>{c.slug}</div>
                          </td>
                          <td>{c.productCount}</td>
                          <td>{c.filterableAttributes}</td>
                          <td>{c.displaySpecAttributes}</td>
                          <td>
                            {c.productsMissingSpecs > 0 ? (
                              <Badge tone="warning">{c.productsMissingSpecs}</Badge>
                            ) : (
                              <Badge tone="success">سليم</Badge>
                            )}
                          </td>
                          <td>
                            <Link to={`/admin/categories/${c.categoryId}`} style={{ fontSize: 12, color: "var(--fz-brand)" }}>
                              إدارة
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="إجراءات سريعة">
                <div className={s.quickGrid}>
                  <Link className={s.quickLink} to="/admin/categories">
                    الأقسام
                  </Link>
                  <Link className={s.quickLink} to="/admin/products/new">
                    منتج جديد
                  </Link>
                  <Link className={s.quickLink} to="/admin/data-quality">
                    جودة البيانات
                  </Link>
                  <Link className={s.quickLink} to="/admin/classification">
                    التصنيف
                  </Link>
                  <Link className={s.quickLink} to="/admin/content">
                    الصفحة الرئيسية
                  </Link>
                  <Link className={s.quickLink} to="/admin/orders">
                    الطلبات
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
