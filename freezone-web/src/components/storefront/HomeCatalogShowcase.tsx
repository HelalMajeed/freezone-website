"use client";

import { useMemo } from "react";
import { useLocale } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { buildCategorySpotlightsFromCatalog } from "@/lib/category-icon-auto";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { HomeHotItemsRail } from "@/components/storefront/HomeHotItemsRail";

/** Icon strip + mega cards from the same catalog order (homepage default). */
export function HomeCatalogShowcase(props: { megaPayload?: Record<string, unknown> } = {}) {
  const { megaPayload } = props;
  const locale = useLocale() as "en" | "ar";
  const { catalog } = useStorefront();
  const spots = useMemo(
    () => buildCategorySpotlightsFromCatalog(catalog.categories, locale),
    [catalog.categories, locale],
  );

  return (
    <>
      <MotionReveal delay={0.03}>
        <CategoryIconStrip previewSpots={spots} />
      </MotionReveal>
      <MotionReveal delay={0.04}>
        <HomeHotItemsRail />
      </MotionReveal>
      <MotionReveal delay={0.05}>
        <PromoMegaBlocks payload={megaPayload} />
      </MotionReveal>
    </>
  );
}
