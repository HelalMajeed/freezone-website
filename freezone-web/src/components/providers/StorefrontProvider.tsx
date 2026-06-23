"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicSite } from "@/lib/site-public";
import type { HomeCmsPayload } from "@/lib/layout-cms";
import type { Brand, Category, Product } from "@/lib/data";
import type { ThemeTokens } from "@/lib/theme-tokens";
import type { StorefrontCmsSection } from "@/lib/cms-page-storefront";
import type { HomeCollections, BrandCount } from "@/lib/storefront-bootstrap";

export type StorefrontValue = {
  site: PublicSite;
  home: HomeCmsPayload;
  /** Live catalog from DB (or static fallback when DB offline) — use for homepage sections */
  catalog: {
    /** @deprecated being retired — home rails use `collections`, browsing is
     *  server-paginated. Present only during the catalog.products trim. */
    products: Product[];
    categories: Category[];
    /** Active brands from DB (or static fallback) — logos, strip, search */
    brands: Brand[];
    /** Capped server-computed home rails (featured/newest/onSale/bestSellers). */
    collections?: HomeCollections;
    /** Per-brand counts for the sidebar (all categories). */
    brandCounts?: BrandCount[];
  };
  theme: ThemeTokens;
  /** Published homepage CMS sections — null/empty → use legacy homepage layout */
  homeSections: StorefrontCmsSection[] | null;
};

const StorefrontContext = createContext<StorefrontValue | null>(null);

export function StorefrontProvider({ value, children }: { value: StorefrontValue; children: ReactNode }) {
  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront(): StorefrontValue {
  const v = useContext(StorefrontContext);
  if (!v) throw new Error("useStorefront must be used inside StorefrontProvider");
  return v;
}

/** Footer / SEO helpers — same as `useStorefront().site` */
export function usePublicSite(): PublicSite {
  return useStorefront().site;
}
