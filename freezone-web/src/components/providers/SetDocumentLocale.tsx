"use client";

import { useLayoutEffect } from "react";

/** Syncs <html lang/dir> for the active route segment (root layout owns the tags). */
export function SetDocumentLocale({ locale, dir }: { locale: string; dir: "ltr" | "rtl" }) {
  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir]);
  return null;
}
