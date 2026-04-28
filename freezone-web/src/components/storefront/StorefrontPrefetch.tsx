"use client";

import { useEffect } from "react";
import { useRouter } from "@/navigation";

/** Prefetch main storefront routes shortly after load to speed up first navigation click. */
const PATHS = ["/products", "/contact", "/pc-builder", "/cart", "/about"] as const;

export function StorefrontPrefetch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const t = window.setTimeout(() => {
      if (cancelled) return;
      for (const p of PATHS) {
        try {
          router.prefetch(p);
        } catch {
          /* ignore */
        }
      }
    }, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);

  return null;
}
