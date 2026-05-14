"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freezoneApiUrl, getInternalApiFetchSignal } from "@/lib/api-internal";
import { isDatabaseConfigured } from "@/lib/prisma";
import s from "./AdminDashboard.module.css";

export default function AdminDashboardPage() {
  const q = useQuery({
    queryKey: ["admin-dashboard-stats"],
    enabled: isDatabaseConfigured(),
    queryFn: async () => {
      const res = await fetch(freezoneApiUrl("/api/admin/dashboard-stats"), {
        credentials: "include",
        cache: "no-store",
        signal: getInternalApiFetchSignal(),
      });
      if (res.status === 401) throw new Error("401");
      if (!res.ok) throw new Error("bad");
      return res.json() as Promise<{
        dbConnected?: boolean;
        connectionFailed?: boolean;
        productCount: number;
        orderCount: number;
        categoryCount: number;
        brandCount: number;
        mediaCount: number;
        lowStock: number;
        pendingOrders: number;
      }>;
    },
  });

  let productCount = 0;
  let orderCount = 0;
  let categoryCount = 0;
  let brandCount = 0;
  let mediaCount = 0;
  let lowStock = 0;
  let pendingOrders = 0;
  let dbError = false;
  let apiUnreachable = false;
  let dbConnected = false;
  const authError = false;

  if (q.data) {
    const j = q.data;
    dbConnected = j.dbConnected !== false && j.connectionFailed !== true;
    dbError = j.connectionFailed === true;
    productCount = j.productCount;
    orderCount = j.orderCount;
    categoryCount = j.categoryCount;
    brandCount = j.brandCount;
    mediaCount = j.mediaCount;
    lowStock = j.lowStock;
    pendingOrders = j.pendingOrders;
  }
  if (q.error) {
    apiUnreachable = true;
  }

  const links: { href: string; title: string; desc: string }[] = [
    { href: "/admin/cms", title: "إعدادات الموقع (CMS)", desc: "الشعار، الهيرو، التيكر، شريط الثقة، البقع، التنقل، والعروض." },
    { href: "/admin/content", title: "بناء الصفحة الرئيسية", desc: "أقسام ديناميكية وترتيبها ونشرها للزائر." },
    { href: "/admin/media", title: "مكتبة الوسائط", desc: "رفع الصور والفيديو وإعادة استخدامها في المنتجات والصفحات." },
    { href: "/admin/design", title: "المظهر والألوان", desc: "ألوان الثيم والتباعد والخطوط كما تظهر في المتجر." },
    { href: "/admin/products", title: "المنتجات", desc: "إضافة وتعديل المنتجات، الصور، والمخزون." },
    { href: "/admin/categories", title: "التصنيفات", desc: "تصنيفات المتجر والفلاتر كما يظهر في صفحة المنتجات." },
    { href: "/admin/brands", title: "العلامات التجارية", desc: "شعارات العلامات وربطها بالمنتجات وشريط العلامات." },
    { href: "/admin/orders", title: "الطلبات", desc: "متابعة الطلبات وحالات التنفيذ." },
    { href: "/admin/coupons", title: "الكوبونات", desc: "أكواد الخصم وشروطها في صفحة الدفع." },
    { href: "/admin/audit", title: "سجل التدقيق", desc: "متابعة تغييرات الإدارة على المنتجات والمحتوى والطلبات." },
  ];

  if (q.isLoading) {
    return <div className={s.wrap}>جاري التحميل…</div>;
  }

  return (
    <div className={s.wrap}>
      <h1 className={s.title}>لوحة التحكم</h1>
      <p className={s.subtitle}>
        إدارة موحّدة للمحتوى الذي يراه الزائر: الصفحة الرئيسية، الكتالوج، الطلبات، والمظهر. يُفضّل تشغيل خادم الـ API الخلفي مع{" "}
        <code style={{ fontSize: "0.85em" }}>DATABASE_URL</code> لعرض البيانات الحية.
      </p>

      <div className={s.badgeRow}>
        {authError ? (
          <span className={`${s.badge} ${s.badgeWarn}`}>⚠ انتهت الجلسة أو رفض الخادم الطلب</span>
        ) : apiUnreachable ? (
          <span className={`${s.badge} ${s.badgeWarn}`}>⚠ خادم API غير متاح (المنفذ 4000)</span>
        ) : dbError ? (
          <span className={`${s.badge} ${s.badgeWarn}`}>⚠ فشل الاتصال بقاعدة البيانات</span>
        ) : dbConnected ? (
          <span className={`${s.badge} ${s.badgeOk}`}>● متصل بقاعدة البيانات</span>
        ) : (
          <span className={`${s.badge} ${s.badgeWarn}`}>وضع بدون قاعدة بيانات — بيانات تجريبية</span>
        )}
      </div>

      {authError && (
        <div className={s.alert}>
          أعد{" "}
          <Link to="/admin/login">تسجيل الدخول</Link> وتأكد أن خادم الـ API يعمل وأن <code style={{ fontSize: 12 }}>ADMIN_SESSION_SECRET</code> متطابق
          في <code style={{ fontSize: 12 }}>freezone-web/.env</code> و<code style={{ fontSize: 12 }}>freezone-api/.env</code>.
        </div>
      )}

      {apiUnreachable && !authError && (
        <div className={s.alert}>
          <strong>خادم الـ API غير متاح على المنفذ 4000.</strong> شغّل <code style={{ fontSize: 12 }}>npm run dev</code> من المشروع (يشغّل الـ API + الواجهة).
        </div>
      )}

      {dbError && !authError && !apiUnreachable && (
        <div className={s.alert}>
          <strong>شغّل PostgreSQL</strong> بحيث يطابق <code style={{ fontSize: 12 }}>DATABASE_URL</code> في <code style={{ fontSize: 12 }}>freezone-api/.env</code>.
        </div>
      )}

      <div className={s.stats}>
        <div className={s.statCard}>
          <div className={s.statLabel}>منتجات</div>
          <div className={s.statValue}>{productCount}</div>
          <Link to="/admin/products" className={s.statLink}>
            إدارة →
          </Link>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>طلبات</div>
          <div className={s.statValue}>{orderCount}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>معلّقة: {pendingOrders}</div>
          <Link to="/admin/orders" className={s.statLink}>
            عرض →
          </Link>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>تصنيفات</div>
          <div className={s.statValue}>{categoryCount}</div>
          <Link to="/admin/categories" className={s.statLink}>
            تصنيفات →
          </Link>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>علامات</div>
          <div className={s.statValue}>{brandCount}</div>
          <Link to="/admin/brands" className={s.statLink}>
            علامات →
          </Link>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>وسائط</div>
          <div className={s.statValue}>{mediaCount}</div>
          <Link to="/admin/media" className={s.statLink}>
            المكتبة →
          </Link>
        </div>
        <div className={s.statCard}>
          <div className={s.statLabel}>مخزون منخفض</div>
          <div className={s.statValue}>{lowStock}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>&lt; 5 وحدات ومنشور</div>
        </div>
      </div>

      <h2 className={s.sectionTitle}>إجراءات سريعة</h2>
      <div className={s.actions}>
        <Link to="/admin/cms" className={s.btnPrimary}>
          تعديل الصفحة الرئيسية والشريط
        </Link>
        <Link to="/admin/products" className={s.btnSecondary}>
          إضافة منتج
        </Link>
        <Link to="/admin/coupons" className={s.btnSecondary}>
          كوبون جديد
        </Link>
        <Link to="/admin/content" className={s.btnSecondary}>
          بناء أقسام الصفحة الرئيسية
        </Link>
      </div>

      <h2 className={s.sectionTitle}>كل أقسام الإدارة</h2>
      <div className={s.grid}>
        {links.map((item) => (
          <Link key={item.href} to={item.href} className={s.linkCard}>
            <div className={s.linkCardTitle}>{item.title}</div>
            <p className={s.linkCardDesc}>{item.desc}</p>
          </Link>
        ))}
      </div>

      <p className={s.hint}>
        <strong style={{ color: "#e2e8f0" }}>ربط الزائر:</strong> المحتوى المنشور من CMS والمنتجات والتصنيفات والعلامات يُحمَّل في واجهة المتجر عبر{" "}
        <code>StorefrontProvider</code>.
      </p>
    </div>
  );
}
