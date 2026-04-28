"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

type Dict = typeof en;

const dictionaries: Record<string, Dict> = { en, ar };

type I18nContextValue = {
  locale: string;
  dir: "ltr" | "rtl";
  t: (path: string) => string;
  setLocale: (locale: string) => void;
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getByPath(obj: unknown, path: string): string {
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else return path;
  }
  return typeof cur === "string" ? cur : path;
}

export function I18nProvider({ locale, children }: { locale: string; children: React.ReactNode }) {
  const [loc, setLoc] = useState(locale);
  useEffect(() => {
    setLoc(locale);
  }, [locale]);
  const dict = dictionaries[loc] ?? en;
  const dir: "ltr" | "rtl" = loc === "ar" ? "rtl" : "ltr";

  const t = useCallback((path: string) => getByPath(dict as unknown, path), [dict]);

  const value = useMemo(
    () => ({
      locale: loc,
      dir,
      t,
      setLocale: setLoc,
    }),
    [loc, dir, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
