"use client";

import { useMemo } from "react";
import { useLocale } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { buildCategorySpotlightsFromCatalog } from "@/lib/category-icon-auto";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { HomeCommerceStack } from "@/components/storefront/HomeCommerceStack";

/** Icon strip → hot items → brands → mega cards (homepage default). */
export function HomeCatalogShowcase(props: { megaPayload?: Record<string, unknown> } = {}) {
  const { megaPayload } = props;
  const locale = useLocale() as "en" | "ar";
  const { catalog } = useStorefront();
  const spots = useMemo(
    () => buildCategorySpotlightsFromCatalog(catalog.categories, locale),
    [catalog.categories, locale],
  );

  return (
    <MotionReveal delay={0.03}>
      <HomeCommerceStack stripSpots={spots} megaPayload={megaPayload} />
    </MotionReveal>
  );
}
