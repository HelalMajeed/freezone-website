import { Link } from "react-router-dom";
import styles from "./LocaleShellScreens.module.css";

/** Storefront could not load from the API — token-styled, bilingual. */
export function StorefrontErrorScreen({ message }: { message: string }) {
  return (
    <div className={`container ${styles.errorScreen}`}>
      <h1 className={`fz-type-h2 ${styles.errorTitle}`}>Unable to load the store</h1>
      <p className={`fz-type-body ${styles.errorTitleAr}`} lang="ar" dir="rtl">
        تعذر تحميل المتجر.
      </p>
      <p className={`fz-type-small ${styles.errorHelp}`}>
        The storefront could not load catalog data from the API. Check Netlify <code>VITE_API_URL</code> (origin
        only, no <code>/api</code> suffix), then clear cache and redeploy.
      </p>
      <pre className={styles.errorDetail}>{message}</pre>
    </div>
  );
}

/** Site flagged `maintenanceMode` from Admin — token-styled, bilingual. */
export function MaintenanceScreen({ locale }: { locale: "en" | "ar" }) {
  const ar = locale === "ar";
  return (
    <div className={styles.maintenance}>
      <h1 className={`fz-type-h2 ${styles.maintenanceTitle}`}>
        {ar ? "الموقع تحت الصيانة" : "We’ll be right back"}
      </h1>
      <p className={`fz-type-body ${styles.maintenanceBody}`}>
        {ar
          ? "نعمل على تحسين تجربتكم. يمكن للمسؤولين الاستمرار في لوحة التحكم على "
          : "We’re improving your experience. Admins can keep working in the dashboard at "}
        <Link to="/dashboard" className={styles.maintenanceLink}>
          /dashboard
        </Link>
        .
      </p>
    </div>
  );
}
