/**
 * إعدادات اسم العلامة والشعار
 *
 * لاستخدام شعاركم (صورة واحدة تحتوي الأيقونة + الاسم إن أردتم):
 * 1) ضع الملف داخل المجلد `public` مثلاً: `public/site-logo.png`
 * 2) إمّا أن تنشئ ملف `.env.local` في جذر المشروع (بجانب package.json) وتضيف:
 *    NEXT_PUBLIC_SITE_LOGO_URL=/site-logo.png
 *    أو تغيّر `SITE_LOGO_PUBLIC_PATH` أدناه إلى نفس المسار (مثل `/site-logo.png`)
 *
 * Site logo: add your file under `public/`, then set NEXT_PUBLIC_SITE_LOGO_URL in `.env.local`
 * or set SITE_LOGO_PUBLIC_PATH below. Leave both empty to use the default FZ + text mark.
 */
export const SITE_BRAND_NAME = "Store";

/** مسار من جذر الموقع، يبدأ بـ `/` — مثال: `/site-logo.png` أو `/images/brand.svg` */
export const SITE_LOGO_PUBLIC_PATH = "";

export function resolveSiteLogoUrl(): string | null {
  const fromEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SITE_LOGO_URL?.trim() ?? ""
      : "";
  const path = (fromEnv || SITE_LOGO_PUBLIC_PATH).trim();
  return path.length > 0 ? path : null;
}
