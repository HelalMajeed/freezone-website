"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductSlider } from "@/components/ui/ProductSlider";
import { resolveNewProducts } from "@/lib/home-section-products";
import type { Product } from "@/lib/data";

const NEW_ARRIVALS_LIMIT = 16;

type HomeNewArrivalsRailProps = {
  products?: Product[];
  title?: string;
  link?: string;
};

/** Horizontal rail for products marked as new (وصل حديثاً). */
export function HomeNewArrivalsRail({ products, title, link }: HomeNewArrivalsRailProps = {}) {
  const t = useTranslations("Home");
  const locale = useLocale() as "en" | "ar";
  const { catalog, home } = useStorefront();

  const list = useMemo(
    () => products ?? resolveNewProducts(catalog.products, NEW_ARRIVALS_LIMIT),
    [products, catalog.products],
  );

  const pc = home.pageCopy;
  const copyTitle =
    locale === "ar"
      ? pc?.newArrivalsTitleAr?.trim() || pc?.newArrivalsTitleEn?.trim()
      : pc?.newArrivalsTitleEn?.trim() || pc?.newArrivalsTitleAr?.trim();

  return (
    <ProductSlider
      title={title ?? copyTitle ?? t("newArrivals")}
      link={link ?? "/products?isNew=true"}
      products={list}
      bgColor="#fff"
      compact
      ctaVariant="teal"
    />
  );
}
