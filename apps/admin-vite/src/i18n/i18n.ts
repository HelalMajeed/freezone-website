import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "../locales/en.json";
import ar from "../locales/ar.json";

const STORAGE_KEY = "adminLang";

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) ?? "en" : "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export function setAdminLanguage(lng: "en" | "ar") {
  localStorage.setItem(STORAGE_KEY, lng);
  void i18n.changeLanguage(lng);
}
