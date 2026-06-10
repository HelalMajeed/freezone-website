/**
 * Centralized dashboard i18n.
 *
 * Replaces the inline `lang === "ar" ? "…" : "…"` ternaries scattered through
 * the dashboard with a typed catalog + one hook:
 *
 * ```tsx
 * const { lang, dir, t, pick, formatError } = useDashboardLocale();
 * t("confirm.cancel");                       // catalog key
 * t("pagination.rangeOf", { from: 1, to: 25, total: 412 }); // interpolation
 * pick({ en: "Products", ar: "المنتجات" });  // inline bilingual pair (NAV pattern)
 * formatError(err);                          // DashboardApiError → localized copy
 * ```
 *
 * Locale source of truth stays the app-wide i18next instance (the language
 * toggle goes through `i18n.changeLanguage`), so the storefront and dashboard
 * never disagree about the active language.
 */
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import appI18n from "@/i18n/i18n";
import { dashboardEn, type DashboardMessageKey } from "./en";
import { dashboardAr } from "./ar";
import { dashboardErrorByCode, DASHBOARD_ERROR_MESSAGES, type BilingualMessage } from "./errors";
import { DashboardApiError } from "@/lib/dashboard/api";

export type DashboardLang = "en" | "ar";
export type { DashboardMessageKey, BilingualMessage };
export { dashboardEn, dashboardAr, DASHBOARD_ERROR_MESSAGES, dashboardErrorByCode };

const CATALOGS: Record<DashboardLang, Record<DashboardMessageKey, string>> = {
  en: dashboardEn,
  ar: dashboardAr,
};

/**
 * Dashboard language preference — independent from the storefront (whose
 * language is ruled by the /en | /ar URL prefix). The admin panel is
 * Arabic-first: with no persisted choice it opens in Arabic; an explicit
 * toggle through {@link useDashboardLocale}'s `setLang` always wins.
 */
const DASHBOARD_LANG_PREF_KEY = "fz-dashboard-lang";

export function readDashboardLangPref(): DashboardLang | null {
  try {
    const v = window.localStorage.getItem(DASHBOARD_LANG_PREF_KEY);
    return v === "ar" || v === "en" ? v : null;
  } catch {
    return null;
  }
}

function persistDashboardLangPref(lang: DashboardLang): void {
  try {
    window.localStorage.setItem(DASHBOARD_LANG_PREF_KEY, lang);
  } catch {
    /* private mode — preference simply not persisted */
  }
}

/** Apply the persisted dashboard language (default "ar") on admin-app mount. */
export function applyDashboardLangDefault(): void {
  void appI18n.changeLanguage(readDashboardLangPref() ?? "ar");
}

/** `{placeholder}` interpolation for catalog templates. */
export function formatMessage(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Non-hook translate (for code outside React, e.g. api helpers). */
export function dashboardT(
  lang: DashboardLang,
  key: DashboardMessageKey,
  vars?: Record<string, string | number>,
): string {
  return formatMessage(CATALOGS[lang][key] ?? CATALOGS.en[key] ?? key, vars);
}

/** Localized human message for any thrown error (DashboardApiError or unknown). */
export function dashboardErrorMessage(err: unknown, lang: DashboardLang): string {
  if (err instanceof DashboardApiError) {
    return dashboardErrorByCode(err.code)[lang];
  }
  if (err instanceof DOMException && (err.name === "TimeoutError" || err.name === "AbortError")) {
    return DASHBOARD_ERROR_MESSAGES.TIMEOUT[lang];
  }
  if (err instanceof TypeError) {
    // fetch() network failures surface as TypeError
    return DASHBOARD_ERROR_MESSAGES.NETWORK[lang];
  }
  return DASHBOARD_ERROR_MESSAGES.INTERNAL_ERROR[lang];
}

export type DashboardLocale = {
  lang: DashboardLang;
  dir: "ltr" | "rtl";
  /** Translate a dashboard catalog key (optionally with `{var}` interpolation). */
  t: (key: DashboardMessageKey, vars?: Record<string, string | number>) => string;
  /** Pick the active side of an inline `{ en, ar }` pair (NAV-label pattern). */
  pick: (pair: BilingualMessage) => string;
  /** Localized message for a caught error (API error codes → bilingual copy). */
  formatError: (err: unknown) => string;
  /** Switch the app language (persists through the shared i18next instance). */
  setLang: (lang: DashboardLang) => void;
};

export function useDashboardLocale(): DashboardLocale {
  const { i18n } = useTranslation();
  const lang: DashboardLang = (i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en";

  const t = useCallback(
    (key: DashboardMessageKey, vars?: Record<string, string | number>) =>
      dashboardT(lang, key, vars),
    [lang],
  );
  const pick = useCallback((pair: BilingualMessage) => pair[lang], [lang]);
  const formatError = useCallback((err: unknown) => dashboardErrorMessage(err, lang), [lang]);
  const setLang = useCallback(
    (next: DashboardLang) => {
      persistDashboardLangPref(next);
      void i18n.changeLanguage(next);
    },
    [i18n],
  );

  return useMemo(
    () => ({ lang, dir: lang === "ar" ? "rtl" : "ltr", t, pick, formatError, setLang }),
    [lang, t, pick, formatError, setLang],
  );
}
