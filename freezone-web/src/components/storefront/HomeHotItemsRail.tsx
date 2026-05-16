"use client";

import { useMemo } from "react";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { ProductSlider } from "@/components/ui/ProductSlider";
import { resolveHotProducts } from "@/lib/home-section-products";
import type { Product } from "@/lib/data";

const HOT_ITEMS_LIMIT = 16;

type HomeHotItemsRailProps = {
  products?: Product[];
  title?: string;
  link?: string;
};

/** Horizontal product rail (hot / best sellers) between category icons and mega cards. */
export function HomeHotItemsRail({ products, title, link }: HomeHotItemsRailProps = {}) {
  const t = useTranslations("Home");
  const { catalog } = useStorefront();

  const list = useMemo(
    () => products ?? resolveHotProducts(catalog.products, HOT_ITEMS_LIMIT),
    [products, catalog.products],
  );

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
