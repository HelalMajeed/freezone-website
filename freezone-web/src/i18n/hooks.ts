import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function useLocale(): "en" | "ar" {
  const { locale } = useParams<{ locale: string }>();
  return locale === "ar" ? "ar" : "en";
}

/** Replaces next-intl `useTranslations("Namespace")` — keys are relative to that namespace. */
export function useTranslations(ns: string) {
  const { t } = useTranslation("translation", { keyPrefix: ns });
  return t;
}

export { Trans } from "react-i18next";
