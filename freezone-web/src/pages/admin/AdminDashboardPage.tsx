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

function stockLabel(
  inStock: boolean,
  quantity: number,
): { label: string; tone: "success" | "warning" | "neutral" } {
  if (!inStock) return { label: "غير متوفر", tone: "warning" };
  if (quantity <= 0) return { label: "مخزون غير محدد", tone: "warning" };
  if (quantity < 5) return { label: `مخزون منخفض (${quantity})`, tone: "warning" };
  return { label: `متوفر (${quantity})`, tone: "success" };
}

function categoryStatusLabel(status: "healthy" | "warning" | "empty"): {
  label: string;
  tone: "success" | "warning" | "neutral";
} {
  if (status === "healthy") return { label: "سليم", tone: "success" };
  if (status === "warning") return { label: "يحتاج مراجعة", tone: "warning" };
  return { label: "فارغ", tone: "neutral" };
}

function Kpi({
  label,
  hint,
  value,
  href,
  tone,
}: {
  label: string;
  hint?: string;
  value: number | string;
  href: string;
  tone?: "warning" | "danger";
}) {
  return (
    <Link to={href} className={`${dashUi.kpi} ${s.kpiLink}`}>
      <div className={dashUi.kpiLabel}>{label}</div>
      {hint ? <div className={s.kpiHint}>{hint}</div> : null}
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

type OperatorStats = {
  role: string;
  isManager: boolean;
  teamPendingReview: number;
  myDrafts: number;
  myPendingReview: number;
  myChangesRequested: number;
  productsCreatedToday: number;
  categoriesWithoutAttrs: number;
};

async function fetchOperatorStats(): Promise<OperatorStats | null> {
  const res = await fetch(freezoneApiUrl("/api/admin/operator-stats"), { credentials: "include" });
  if (!res.ok) return null;
  const j = (await res.json()) as { data?: OperatorStats };
  return j.data ?? null;
}

export default function AdminDashboardPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    enabled: isDatabaseConfigured(),
    queryFn: fetchAdminDashboard,
    staleTime: 60_000,
  });
  const opQ = useQuery({
    queryKey: ["admin-operator-stats"],
    enabled: isDatabaseConfigured(),
    queryFn: fetchOperatorStats,
    staleTime: 30_000,
  });

  const d = q.data;
  const stats = d?.stats;
  const loading = q.isLoading;
  const apiDown = q.isError;

  if (loading) return <div className="dashboard-loader" />;

  const catalogSum =
    stats != null ? stats.publishedProducts + stats.draftProducts : 0;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">لوحة التحكم</h1>
          <div className="dashboard-page-subtitle">
            أرقام المنتجات النشطة فقط (بدون المحذوف) — «على المتجر» = منشور ويظهر للزوار
          </div>
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
          {(stats.deletedProducts ?? 0) > 0 ? (
            <div className={s.trashBanner} role="status">
              <strong>{stats.deletedProducts} منتج في سلة المهملات</strong>
              <span>
                العداد القديم كان يحسبها ضمن «مسودة» و«إجمالي 187». الواقع:{" "}
                <strong>{stats.publishedProducts} على المتجر</strong> و{" "}
                <strong>{stats.totalProducts} نشط</strong>
                {(stats.draftProducts ?? 0) > 0 ? ` و${stats.draftProducts} مسودة` : ""}.
              </span>
              <Link to="/admin/products?deleted=only" className={s.trashBannerLink}>
                عرض المحذوف →
              </Link>
            </div>
          ) : null}

          {d?.meta?.catalogScope === "active-v2" ? null : (
            <div className={s.staleApiBanner} role="alert">
              الواجهة لا تزال تتصل بـ API قديم — حدّث الصفحة (Ctrl+F5) أو انتظر اكتمال نشر Fly.
            </div>
          )}

          <div className={dashUi.kpiGrid}>
            <Kpi
              label="على المتجر"
              hint="منشور + غير محذوف"
              value={stats.publishedProducts}
              href="/admin/products?published=true"
            />
            <Kpi
              label="إجمالي نشط"
              hint="كل المنتجات غير المحذوفة"
              value={stats.totalProducts}
              href="/admin/products"
            />
            <Kpi
              label="مسودات"
              hint="غير منشور"
              value={stats.draftProducts}
              href="/admin/products?published=false"
              tone={stats.draftProducts > 0 ? "warning" : undefined}
            />
            {(stats.deletedProducts ?? 0) > 0 ? (
              <Kpi
                label="محذوف"
                hint="سلة المهملات"
                value={stats.deletedProducts}
                href="/admin/products?deleted=only"
                tone="warning"
              />
            ) : null}
            {(stats.staleImportDrafts ?? 0) > 0 ? (
              <Kpi
                label="مسودات استيراد"
                hint="بقايا استيراد — راجع"
                value={stats.staleImportDrafts}
                href="/admin/products?published=false"
                tone="warning"
              />
            ) : null}
            <Kpi
              label="غير متوفر"
              hint="inStock = لا"
              value={stats.outOfStockProducts}
              href="/admin/products?stock=out"
              tone={stats.outOfStockProducts > 0 ? "warning" : undefined}
            />
            {stats.stockNotSetProducts > 0 ? (
              <Kpi
                label="مخزون غير محدد"
                hint="متوفر لكن الكمية ≤ 0"
                value={stats.stockNotSetProducts}
                href="/admin/products?stock=unset"
                tone="warning"
              />
            ) : null}
            {stats.lowStock > 0 ? (
              <Kpi
                label="مخزون منخفض"
                hint="منشور، كمية 1–4"
                value={stats.lowStock}
                href="/admin/products?published=true"
                tone="warning"
              />
            ) : null}
            <Kpi label="أقسام" value={stats.categoriesCount} href="/admin/categories" />
            <Kpi label="علامات" value={stats.brandsCount} href="/admin/brands" />
          </div>

          {opQ.data ? (
            <div className={dashUi.kpiGrid} style={{ marginTop: 16 }}>
              <Kpi
                label="مسوداتي"
                value={opQ.data.myDrafts}
                href="/admin/products?catalogStatus=DRAFT"
              />
              <Kpi
                label="قيد مراجعتي"
                value={opQ.data.myPendingReview}
                href="/admin/products?catalogStatus=PENDING_REVIEW"
              />
              <Kpi
                label="تعديلات مطلوبة"
                value={opQ.data.myChangesRequested}
                href="/admin/products?catalogStatus=CHANGES_REQUESTED"
                tone={opQ.data.myChangesRequested > 0 ? "warning" : undefined}
              />
              <Kpi label="أنشأت اليوم" value={opQ.data.productsCreatedToday} href="/admin/products" />
              {opQ.data.isManager ? (
                <>
                  <Kpi
                    label="بانتظار الفريق"
                    value={opQ.data.teamPendingReview}
                    href="/admin/review-queue"
                    tone={opQ.data.teamPendingReview > 0 ? "warning" : undefined}
                  />
                  <Kpi
                    label="أقسام بلا سمات"
                    value={opQ.data.categoriesWithoutAttrs}
                    href="/admin/categories"
                    tone={opQ.data.categoriesWithoutAttrs > 0 ? "warning" : undefined}
                  />
                </>
              ) : null}
            </div>
          ) : null}

          {stats.totalProducts !== catalogSum && stats.deletedProducts === 0 ? (
            <p className={s.integrityNote}>
              ملاحظة: مجموع المنشور + المسودات ({stats.publishedProducts + stats.draftProducts}) يختلف عن الإجمالي
              النشط ({stats.totalProducts}) — راجع قاعدة البيانات.
            </p>
          ) : null}

          <h3 className={s.sectionTitle}>يتطلب إجراء</h3>
          <p className={s.sectionHint}>منتجات نشطة فقط — نفس قواعد صفحة جودة البيانات</p>
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
            {(stats.productsLegacySpecsOnly ?? 0) > 0 ? (
              <Kpi
                label="مواصفات قديمة"
                value={stats.productsLegacySpecsOnly}
                href="/admin/data-quality?tab=legacy_specs"
                tone="warning"
              />
            ) : null}
            {stats.pendingOrders > 0 ? (
              <Kpi label="طلبات معلّقة" value={stats.pendingOrders} href="/admin/orders?status=pending" tone="warning" />
            ) : null}
          </div>

          <div className={dashUi.twoCol} style={{ marginTop: 24 }}>
            <div className={s.columnStack}>
              <Card
                title="أولويات اليوم"
                action={
                  <Link to="/admin/data-quality" className={s.cardActionLink}>
                    جودة البيانات
                  </Link>
                }
              >
                {d?.warnings?.length ? (
                  <ul className={s.priorityList}>
                    {d.warnings.map((w, i) => (
                      <li key={i} className={s.priorityItem}>
                        <Badge tone={w.level === "error" ? "danger" : "warning"}>
                          {w.level === "error" ? "عاجل" : "تنبيه"}
                        </Badge>
                        {w.href ? (
                          <Link to={w.href} className={s.priorityLink}>
                            {w.message}
                          </Link>
                        ) : (
                          <span>{w.message}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={s.emptyCopy}>لا توجد تنبيهات عاجلة — الكتالوج بحالة جيدة.</p>
                )}
              </Card>

              <Card
                title="آخر المنتجات"
                action={
                  <Link to="/admin/products" className={s.cardActionLink}>
                    كل المنتجات
                  </Link>
                }
              >
                {!d?.recentProducts?.length ? (
                  <p className={dashUi.empty}>لا منتجات نشطة بعد — ابدأ من الأقسام.</p>
                ) : (
                  d.recentProducts.map((p) => {
                    const stock = stockLabel(p.inStock, p.quantity ?? 0);
                    return (
                      <div className={s.productRow} key={p.id}>
                        <div className={s.productThumb}>
                          {p.imageUrl ? <img src={p.imageUrl} alt="" /> : "—"}
                        </div>
                        <div className={s.productMain}>
                          <div className={s.productName}>
                            #{p.id} {p.nameAr || p.nameEn}
                          </div>
                          <div className={s.productMeta}>
                            {p.categoryName} · {formatDate(p.updatedAt)}
                          </div>
                        </div>
                        <div className={s.productBadges}>
                          <Badge tone={p.published ? "success" : "neutral"}>
                            {p.published ? "منشور" : "مسودة"}
                          </Badge>
                          <Badge tone={stock.tone}>{stock.label}</Badge>
                        </div>
                        <Link to={`/admin/products/edit/${p.id}`} className={s.editLink}>
                          تعديل
                        </Link>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            <div className={s.columnStack}>
              <Card title="صحة الكتالوج حسب القسم">
                <div className={`${dashUi.tableWrap} ${s.healthTableWrap}`}>
                  <table className={`${dashUi.table} ${s.healthTable}`}>
                    <thead>
                      <tr>
                        <th>القسم</th>
                        <th>منتجات نشطة</th>
                        <th>فلاتر</th>
                        <th>عرض</th>
                        <th>مواصفات ناقصة</th>
                        <th>الحالة</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {d?.categoryHealth?.map((c) => {
                        const st = categoryStatusLabel(c.status);
                        return (
                          <tr key={c.categoryId}>
                            <td>
                              <Link to={`/admin/categories/${c.categoryId}`} className={s.categoryNameLink}>
                                {c.name}
                              </Link>
                              <div className={s.categorySlug}>{c.slug}</div>
                            </td>
                            <td>{c.productCount}</td>
                            <td>{c.filterableAttributes}</td>
                            <td>{c.displaySpecAttributes}</td>
                            <td>
                              {c.productsMissingSpecs > 0 ? (
                                <Link
                                  to={`/admin/data-quality?tab=missing_specs`}
                                  className={s.issueCountLink}
                                >
                                  {c.productsMissingSpecs}
                                </Link>
                              ) : (
                                "0"
                              )}
                            </td>
                            <td className={s.statusCell}>
                              <Badge tone={st.tone}>{st.label}</Badge>
                            </td>
                            <td>
                              <Link to={`/admin/categories/${c.categoryId}`} className={s.cardActionLink}>
                                إدارة
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
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
