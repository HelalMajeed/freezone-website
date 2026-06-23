"use client";

import { useTranslations } from "@/i18n/hooks";
import { ProductSlider } from "@/components/ui/ProductSlider";
import type { Product } from "@/lib/data";

type HomeHotItemsRailProps = {
  products?: Product[];
  title?: string;
  link?: string;
};

/** Horizontal product rail (hot / best sellers) between category icons and mega cards. */
export function HomeHotItemsRail({ products, title, link }: HomeHotItemsRailProps = {}) {
  const t = useTranslations("Home");

  const list = products ?? [];

  return (
    <ProductSlider
      title={title ?? t("hotItems")}
      link={link ?? "/products"}
      products={list}
      bgColor="#fff"
      compact
      ctaVariant="teal"
    />
  );
}
