import { defaultLocale, locales, type AppLocale } from "@/navigation";

/**
 * Storefront language preference (A-18). Independent from the dashboard's
 * `fz-dashboard-lang`: the storefront language is ruled by the /en | /ar URL
 * prefix, so this preference only decides where the bare "/" (and non-locale
 * unknown paths) redirect. Written ONLY on an explicit switch through the
 * NavBar language toggle; with no persisted choice the store is Arabic-first.
 */
const STOREFRONT_LANG_PREF_KEY = "fz-storefront-lang";

/** Persisted visitor choice, validated; falls back to the Arabic default. */
export function readPreferredLocale(): AppLocale {
  try {
    const v = window.localStorage.getItem(STOREFRONT_LANG_PREF_KEY);
    return v && (locales as readonly string[]).includes(v) ? (v as AppLocale) : defaultLocale;
  } catch {
    return defaultLocale; // private mode / SSR-less prerender eval
  }
}

export function persistPreferredLocale(locale: AppLocale): void {
  try {
    window.localStorage.setItem(STOREFRONT_LANG_PREF_KEY, locale);
  } catch {
    /* private mode — preference simply not persisted */
  }
}
