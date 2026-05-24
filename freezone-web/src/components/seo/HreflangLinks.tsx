import { useLocation } from "react-router-dom";

/**
 * Emit `<link rel="alternate" hreflang>` + canonical for the current route.
 * React 19 hoists these into <head>. Helps Google serve the right language
 * variant and avoids duplicate-content penalties across ar/en.
 */
export function HreflangLinks({ baseUrl }: { baseUrl: string }) {
  const { pathname } = useLocation();
  /** Strip the leading /ar or /en so we can re-prefix per locale. */
  const rest = pathname.replace(/^\/(ar|en)(?=\/|$)/, "");
  const base = baseUrl.replace(/\/$/, "");
  const arUrl = `${base}/ar${rest}`;
  const enUrl = `${base}/en${rest}`;
  const isArabic = pathname.startsWith("/ar");
  const canonical = isArabic ? arUrl : enUrl;

  return (
    <>
      <link rel="canonical" href={canonical} />
      <link rel="alternate" hrefLang="ar" href={arUrl} />
      <link rel="alternate" hrefLang="en" href={enUrl} />
      <link rel="alternate" hrefLang="x-default" href={arUrl} />
    </>
  );
}
