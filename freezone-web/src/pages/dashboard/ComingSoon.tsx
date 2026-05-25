import { useTranslation } from "react-i18next";
import { Badge, Card } from "@/components/dashboard/ui";

/**
 * Generic placeholder for modules planned in Phase 2.
 * Shows the module name, a "coming soon" message, and a link back to the
 * existing legacy `/admin` page so the team can keep operating during rollout.
 */
export function ComingSoon({
  titleEn,
  titleAr,
  descEn,
  descAr,
  legacyPath,
}: {
  titleEn: string;
  titleAr: string;
  descEn: string;
  descAr: string;
  /** Optional path under old `/admin/...` that still does this job today. */
  legacyPath?: string;
}) {
  const { i18n } = useTranslation();
  const lang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";
  const title = lang === "ar" ? titleAr : titleEn;
  const desc = lang === "ar" ? descAr : descEn;

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{title}</h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar" ? "قيد البناء — المرحلة الثانية." : "Under construction — Phase 2."}
          </div>
        </div>
        <Badge tone="warning">{lang === "ar" ? "قريباً" : "Coming soon"}</Badge>
      </div>

      <Card>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "var(--fz-text-soft)", margin: 0 }}>
          {desc}
        </p>

        {legacyPath && (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: "var(--fz-bg-soft)",
              borderRadius: "var(--fz-radius)",
              fontSize: 13.5,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {lang === "ar" ? "في هذه الأثناء:" : "In the meantime:"}
            </div>
            <div style={{ color: "var(--fz-text-soft)", marginBottom: 8 }}>
              {lang === "ar"
                ? "استخدم اللوحة القديمة — كل التغييرات ستظهر هنا أيضاً."
                : "Use the legacy panel — all changes are still reflected here."}
            </div>
            <a
              href={legacyPath}
              style={{
                color: "var(--fz-brand)",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              {legacyPath}
            </a>
          </div>
        )}
      </Card>
    </>
  );
}

// ─── Pre-bound stubs for each Phase 2 route ─────────────────────────────────

export const ProductsPage = () => (
  <ComingSoon
    titleEn="Products"
    titleAr="المنتجات"
    descEn="Full product CRUD: variants, images, attribute values, secondary categories, specs editor, bulk actions, and stock control."
    descAr="إدارة كاملة للمنتجات: المتغيرات، الصور، قيم السمات، الأقسام الثانوية، محرر المواصفات، وإدارة المخزون."
    legacyPath="/admin/products"
  />
);

export const CategoriesPage = () => (
  <ComingSoon
    titleEn="Categories"
    titleAr="الأقسام"
    descEn="Category tree editor with drag-to-reorder, per-category attributes/facets, hero images, and bulk product moves."
    descAr="محرر شجرة الأقسام مع السحب لإعادة الترتيب، سمات/فلاتر لكل قسم، صور رئيسية، ونقل دفعات من المنتجات."
    legacyPath="/admin/categories"
  />
);

export const BrandsPage = () => (
  <ComingSoon
    titleEn="Brands"
    titleAr="العلامات التجارية"
    descEn="Add brands, upload logos, control sort order and active state."
    descAr="إضافة العلامات، رفع الشعارات، التحكم بالترتيب والحالة."
    legacyPath="/admin/brands"
  />
);

export const OrdersPage = () => (
  <ComingSoon
    titleEn="Orders"
    titleAr="الطلبات"
    descEn="Order list with filters by status / date / customer, full detail view, and lifecycle status updates."
    descAr="قائمة الطلبات مع فلاتر حسب الحالة والتاريخ والزبون، تفاصيل كاملة، وتحديث حالة الطلب."
    legacyPath="/admin/orders"
  />
);

export const CouponsPage = () => (
  <ComingSoon
    titleEn="Coupons"
    titleAr="الكوبونات"
    descEn="Create coupons with percent or fixed discount, validity window, usage limits, and minimum subtotal."
    descAr="إنشاء كوبونات بنسبة مئوية أو خصم ثابت، نافذة صلاحية، حد للاستعمال، وحد أدنى للسلّة."
    legacyPath="/admin/coupons"
  />
);

export const CmsPage = () => (
  <ComingSoon
    titleEn="Pages & CMS"
    titleAr="الصفحات والمحتوى"
    descEn="Drag-and-drop homepage builder: hero slides, ticker, trust bar, featured products, promos, FAQ — draft/publish flow."
    descAr="بناء الصفحة الرئيسية بالسحب والإفلات: شرائح Hero، الشريط المتحرّك، شريط الثقة، المنتجات المميزة، العروض، الأسئلة — مع نظام المسوّدة/النشر."
    legacyPath="/admin/cms"
  />
);

export const MediaPage = () => (
  <ComingSoon
    titleEn="Media library"
    titleAr="مكتبة الوسائط"
    descEn="Upload images, video, and 3D model assets. Search by alt text, replace files, and see usage across products."
    descAr="رفع الصور والفيديو وملفات النماذج ثلاثية الأبعاد. بحث بنص بديل، استبدال ملفات، ومعرفة استخدامها في المنتجات."
    legacyPath="/admin/media"
  />
);

export const DesignPage = () => (
  <ComingSoon
    titleEn="Design & theme"
    titleAr="التصميم"
    descEn="Theme tokens: colors, fonts, radius, header & promo bar styling, hero overlay, trust bar — with live preview."
    descAr="رموز التصميم: الألوان، الخطوط، الزوايا، تنسيق الهيدر وشريط العروض، طبقة Hero، شريط الثقة — مع معاينة مباشرة."
    legacyPath="/admin/design"
  />
);

export const SettingsPage = () => (
  <ComingSoon
    titleEn="Site settings"
    titleAr="إعدادات الموقع"
    descEn="Store name, taglines, contact details, shipping thresholds, payment wallets, navigation menu, SEO meta — single source of truth."
    descAr="اسم المتجر، الشعار، بيانات التواصل، حدود الشحن، محافظ الدفع، قائمة التنقل، بيانات SEO — مصدر موحّد."
    legacyPath="/admin/content"
  />
);
