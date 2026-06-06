import type { DashboardMessageKey } from "./en";

/**
 * Dashboard locale resource — Arabic.
 * Typed against the English catalog, so a missing key is a compile error.
 */
export const dashboardAr: Record<DashboardMessageKey, string> = {
  // ── Shell / layout ────────────────────────────────────────────────────────
  "shell.brandSub": "لوحة التحكم",
  "shell.navAria": "التنقل الرئيسي",
  "shell.openMenu": "فتح القائمة",
  "shell.closeMenu": "إغلاق القائمة",
  "shell.expandSidebar": "توسيع القائمة",
  "shell.collapseSidebar": "طي القائمة",
  "shell.expand": "توسيع",
  "shell.collapse": "طي القائمة",
  "shell.breadcrumbAria": "مسار التنقل",
  "shell.home": "اللوحة",
  "shell.builtForYou": "بُنيت لأجلك",
  "shell.toggleLanguage": "تغيير اللغة",
  "shell.profile": "حسابي وكلمة السر",
  "shell.signOut": "تسجيل الخروج",

  // ── Topbar search / command palette ──────────────────────────────────────
  "search.placeholder": "بحث سريع…",
  "search.aria": "البحث في لوحة التحكم",
  "search.shortcutHint": "Ctrl+K",
  "search.searching": "جارٍ البحث…",
  "search.noResults": "لا نتائج لـ «{q}»",
  "search.minChars": "اكتب حرفين على الأقل",
  "search.error": "فشل البحث — حاول مجددًا",
  "search.products": "المنتجات",
  "search.categories": "الأقسام",
  "search.brands": "العلامات",
  "search.users": "أعضاء الفريق",
  "search.pages": "الصفحات",
  "palette.title": "لوحة الأوامر",
  "palette.placeholder": "ابحث عن المنتجات والأقسام والعلامات والفريق…",
  "palette.navigate": "للتنقل",
  "palette.select": "للفتح",
  "palette.dismiss": "للإغلاق",

  // ── Notifications bell ────────────────────────────────────────────────────
  "notifications.title": "الإشعارات",
  "notifications.aria": "الإشعارات",
  "notifications.unread": "{count} غير مقروء",
  "notifications.empty": "لا إشعارات جديدة",
  "notifications.emptyHint": "ستظهر هنا الطلبات الجديدة وتنبيهات المخزون والمراجعات.",
  "notifications.error": "تعذّر تحميل الإشعارات",
  "notifications.errorHint": "خدمة الإشعارات غير متاحة حاليًا.",
  "notifications.markAllRead": "تعيين الكل كمقروء",
  "notifications.markRead": "تعيين كمقروء",
  "notifications.pendingReview": "{count} منتجات بانتظار المراجعة",
  "notifications.newComments": "{count} تعليقات جديدة على المنتجات",
  "notifications.categoriesNoAttrs": "{count} أقسام بدون خصائص",
  "notifications.refresh": "تحديث",

  // ── Table / pagination ────────────────────────────────────────────────────
  "table.empty": "لا توجد سجلات",
  "table.selectAll": "تحديد كل الصفوف",
  "table.selectRow": "تحديد الصف",
  "table.sortAsc": "مرتب تصاعديًا",
  "table.sortDesc": "مرتب تنازليًا",
  "table.sortBy": "ترتيب حسب {column}",
  "table.selectedCount": "{count} محدد",
  "table.clearSelection": "إلغاء التحديد",
  "pagination.rangeOf": "{from}–{to} من {total}",
  "pagination.first": "الصفحة الأولى",
  "pagination.previous": "الصفحة السابقة",
  "pagination.next": "الصفحة التالية",
  "pagination.last": "الصفحة الأخيرة",
  "pagination.perPage": "لكل صفحة",
  "pagination.page": "صفحة {page} من {pages}",

  // ── Dialogs / drawers / toasts ────────────────────────────────────────────
  "dialog.close": "إغلاق",
  "confirm.title": "هل أنت متأكد؟",
  "confirm.confirm": "تأكيد",
  "confirm.cancel": "إلغاء",
  "confirm.delete": "حذف",
  "toast.dismiss": "إخفاء",
  "drawer.close": "إغلاق اللوحة",

  // ── Generic ───────────────────────────────────────────────────────────────
  "common.loading": "جارٍ التحميل…",
  "common.retry": "إعادة المحاولة",
  "common.save": "حفظ",
  "common.cancel": "إلغاء",
  "common.search": "بحث",
  "common.clear": "مسح",
  "common.viewAll": "عرض الكل",
  "common.noData": "لا شيء هنا بعد",
  "common.justNow": "الآن",
};
