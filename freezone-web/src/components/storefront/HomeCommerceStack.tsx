"use client";

import type { ReactNode } from "react";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { HomeFlashDealsRail } from "@/components/storefront/HomeFlashDealsRail";
import { HomeHotItemsRail } from "@/components/storefront/HomeHotItemsRail";
import { HomeNewArrivalsRail } from "@/components/storefront/HomeNewArrivalsRail";
import { BrandTicker } from "@/components/ui/BrandTicker";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import type { PublicSpotlightItem } from "@/lib/layout-cms";

type HomeCommerceStackProps = {
  stripSpots?: PublicSpotlightItem[];
  showStrip?: boolean;
  showFlashDeals?: boolean;
  showHotItems?: boolean;
  showNewArrivals?: boolean;
  showBrands?: boolean;
  megaPayload?: Record<string, unknown>;
};

/** Icons → hot items → new arrivals → brands → mega cards (homepage commerce block). */
export function HomeCommerceStack({
  stripSpots,
  showStrip = true,
  showFlashDeals = true,
  showHotItems = true,
  showNewArrivals = true,
  showBrands = true,
  megaPayload,
}: HomeCommerceStackProps) {
  /** Home rails read small capped server collections — never the full catalog. */
  const { catalog } = useStorefront();
  const collections = catalog.collections;
  const nodes: ReactNode[] = [];

  if (showStrip) {
    nodes.push(<CategoryIconStrip key="strip" previewSpots={stripSpots} />);
  }
  if (showFlashDeals) {
    nodes.push(<HomeFlashDealsRail key="flash" products={collections?.onSale} />);
  }
  if (showHotItems) {
    nodes.push(<HomeHotItemsRail key="hot" products={collections?.bestSellers} />);
  }
  if (showNewArrivals) {
    nodes.push(
      <HomeNewArrivalsRail
        key="new"
        products={collections?.newest}
        link={collections?.hasNew ? "/products?isNew=true" : "/products"}
      />,
    );
  }
  if (showBrands) {
    nodes.push(<BrandTicker key="brands" compact />);
  }
  nodes.push(<PromoMegaBlocks key="mega" payload={megaPayload} />);

  return <>{nodes}</>;
}
