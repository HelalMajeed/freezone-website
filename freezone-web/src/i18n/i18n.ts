import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

const resources = {
  en: { translation: en as Record<string, unknown> },
  ar: { translation: ar as Record<string, unknown> },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setLocale(lng: "en" | "ar") {
  void i18n.changeLanguage(lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
}

export default i18n;
