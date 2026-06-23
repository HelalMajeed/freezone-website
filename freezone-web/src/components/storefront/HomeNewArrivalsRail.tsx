"use client";

import { useLocale, useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductSlider } from "@/components/ui/ProductSlider";
import type { Product } from "@/lib/data";

type HomeNewArrivalsRailProps = {
  products?: Product[];
  title?: string;
  link?: string;
};

/** Horizontal rail for products marked as new (وصل حديثاً). */
export function HomeNewArrivalsRail({ products, title, link }: HomeNewArrivalsRailProps = {}) {
  const t = useTranslations("Home");
  const locale = useLocale() as "en" | "ar";
  const { home } = useStorefront();

  const list = products ?? [];
  const viewAllLink = link ?? "/products";

  const pc = home.pageCopy;
  const copyTitle =
    locale === "ar"
      ? pc?.newArrivalsTitleAr?.trim() || pc?.newArrivalsTitleEn?.trim()
      : pc?.newArrivalsTitleEn?.trim() || pc?.newArrivalsTitleAr?.trim();

  return (
    <ProductSlider
      title={title ?? copyTitle ?? t("newArrivals")}
      link={viewAllLink}
      products={list}
      bgColor="#fff"
      compact
      ctaVariant="teal"
    />
  );
}
