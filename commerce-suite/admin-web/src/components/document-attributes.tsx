"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function DocumentAttributes() {
  const pathname = usePathname();
  const seg = pathname?.split("/").filter(Boolean)[0];

  useEffect(() => {
    if (seg === "ar" || seg === "en") {
      document.documentElement.lang = seg;
      document.documentElement.dir = seg === "ar" ? "rtl" : "ltr";
    }
  }, [seg]);

  return null;
}
