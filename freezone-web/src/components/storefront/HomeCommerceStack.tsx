"use client";

import type { ReactNode } from "react";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { HomeHotItemsRail } from "@/components/storefront/HomeHotItemsRail";
import { HomeNewArrivalsRail } from "@/components/storefront/HomeNewArrivalsRail";
import { BrandTicker } from "@/components/ui/BrandTicker";
import type { PublicSpotlightItem } from "@/lib/layout-cms";

type HomeCommerceStackProps = {
  stripSpots?: PublicSpotlightItem[];
  showStrip?: boolean;
  showHotItems?: boolean;
  showNewArrivals?: boolean;
  showBrands?: boolean;
  megaPayload?: Record<string, unknown>;
};

/** Icons → hot items → new arrivals → brands → mega cards (homepage commerce block). */
export function HomeCommerceStack({
  stripSpots,
  showStrip = true,
  showHotItems = true,
  showNewArrivals = true,
  showBrands = true,
  megaPayload,
}: HomeCommerceStackProps) {
  const nodes: ReactNode[] = [];

  if (showStrip) {
    nodes.push(<CategoryIconStrip key="strip" previewSpots={stripSpots} />);
  }
  if (showHotItems) {
    nodes.push(<HomeHotItemsRail key="hot" />);
  }
  if (showNewArrivals) {
    nodes.push(<HomeNewArrivalsRail key="new" />);
  }
  if (showBrands) {
    nodes.push(<BrandTicker key="brands" compact />);
  }
  nodes.push(<PromoMegaBlocks key="mega" payload={megaPayload} />);

  return <>{nodes}</>;
}
