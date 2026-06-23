"use client";

import type { ReactNode } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useLocale } from "@/i18n/hooks";
import type { StorefrontCmsSection } from "@/lib/cms-page-storefront";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import styles from "@/app/locale/page.module.css";
import { HeroSlider } from "@/components/ui/HeroSlider";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { LucideByName } from "@/lib/lucide-icon-map";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { HomeCatalogShowcase } from "@/components/storefront/HomeCatalogShowcase";
import { HomeCommerceStack } from "@/components/storefront/HomeCommerceStack";
import { ProductSlider } from "@/components/ui/ProductSlider";
import {
  fetchCatalogProducts,
  fetchProductsByIds,
  type CatalogProductsQuery,
} from "@/lib/catalog-products-api";
import { BrandTicker } from "@/components/ui/BrandTicker";
import { StoreGallery } from "@/components/ui/StoreGallery";
import { TabbedShowcase } from "@/components/ui/TabbedShowcase";
import { FAQSection } from "@/components/ui/FAQSection";
import { BannerSlider } from "@/components/storefront/sections/BannerSlider";
import { CategoriesShowcase } from "@/components/storefront/sections/CategoriesShowcase";
import { PromoGrid } from "@/components/storefront/sections/PromoGrid";
import {
  TestimonialsSection,
  CtaSection,
  SplitRichtext,
} from "@/components/storefront/sections/CmsRichSections";
import {
  buildHeroPreviewFromPayload,
  buildTrustItemsFromPayload,
  resolveCategoryStripItems,
} from "@/lib/home-section-custom-payload";
import { trustBarChromeStyle } from "@/lib/layout-cms";

function asObj(p: unknown): Record<string, unknown> {
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(locale: "en" | "ar", ar: unknown, en: unknown): string {
  return locale === "ar" ? str(ar) || str(en) : str(en) || str(ar);
}

function SectionBlock({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <MotionReveal delay={delay}>{children}</MotionReveal>;
}

function featuredFilterToQuery(
  filter: string,
  catSlug: string | undefined,
  locale: "en" | "ar",
  limit: number,
): CatalogProductsQuery {
  if (filter === "new") return { locale, isNew: true, pageSize: limit };
  if (filter === "featured") return { locale, featured: true, pageSize: limit };
  if (filter === "hot" || filter === "bestsellers") return { locale, sort: "best-selling", pageSize: limit };
  if (filter === "sale" || filter === "onSale") return { locale, onSale: true, pageSize: limit };
  if (filter === "cat" && catSlug?.trim()) {
    const slugs = catSlug.split(/[,،\s]+/).map((s) => s.trim()).filter(Boolean).join(",");
    return { locale, cat: slugs || undefined, pageSize: limit };
  }
  return { locale, pageSize: limit };
}

/** CMS "featured_products" section — fetches its product slice server-side
 *  (new/featured/hot/sale/cat/manual) instead of slicing the full catalog. */
function FeaturedProductsSection({
  payload: p,
  locale,
}: {
  payload: Record<string, unknown>;
  locale: "en" | "ar";
}) {
  const title = pick(locale, p.titleAr, p.titleEn);
  const link = str(p.link).trim() || "/products";
  const filter = typeof p.filter === "string" ? p.filter : "featured";
  const limit = Math.min(48, Math.max(1, typeof p.limit === "number" ? p.limit : 16));
  const catSlug = typeof p.catSlug === "string" ? p.catSlug : undefined;
  const productIds = Array.isArray(p.productIds)
    ? p.productIds.map((x) => Number(x)).filter((n) => Number.isFinite(n))
    : undefined;
  const viewAllRaw = pick(locale, p.viewAllAr, p.viewAllEn);
  const bgColor = typeof p.bgColor === "string" ? p.bgColor : "#fff";
  const ctaVariant = p.ctaVariant === "teal" ? "teal" : "gray";
  const isManual = Boolean(productIds && productIds.length > 0);

  const { data: products = [] } = useQuery({
    queryKey: ["home-featured", locale, isManual ? { ids: productIds } : { filter, catSlug, limit }],
    queryFn: async () => {
      if (isManual && productIds) return (await fetchProductsByIds(productIds, locale)).slice(0, limit);
      return (await fetchCatalogProducts(featuredFilterToQuery(filter, catSlug, locale, limit))).products;
    },
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  return (
    <ProductSlider
      title={title || (locale === "ar" ? "منتجات مميزة" : "Featured products")}
      link={link}
      products={products}
      bgColor={bgColor}
      viewAllLabel={viewAllRaw.trim() || undefined}
      ctaVariant={ctaVariant}
      compact
    />
  );
}

/**
 * Renders published CMS sections in stored order, then appends deterministic
 * fallbacks for missing narrative beats — hero → categories → deals →
 * product rails → trust → showroom (docs/STOREFRONT_DESIGN.md §5).
 */
export function DynamicHomeSections({ sections }: { sections: StorefrontCmsSection[] }) {
  const locale = useLocale() as "en" | "ar";
  const { home, catalog } = useStorefront();
  const has = (type: string) => sections.some((s) => s.type === type);

  const hasPromoMega = has("promo_mega");
  const hasCategoryStrip = has("category_strip");
  const hasCategoriesShowcase = has("categories_showcase");
  const hasBrandsStrip = has("brands_strip");
  const hasShowroom = has("showroom");

  /**
   * Deterministic fallback order (replaces the old conditional ternary chain):
   * 1. categories + commerce rails when the CMS provided none of them;
   * 2. showroom proof at the very end.
   */
  const fallbackBlocks: { key: string; node: ReactNode }[] = [];
  if (!hasPromoMega) {
    if (!hasCategoryStrip && !hasCategoriesShowcase) {
      /* No categories beat and no mega blocks → full commerce stack (strip → rails → brands → mega) */
      fallbackBlocks.push({ key: "fallback-commerce", node: <HomeCatalogShowcase /> });
    } else {
      /* Categories exist → append rails/brands/mega only */
      fallbackBlocks.push({
        key: "fallback-rails",
        node: <HomeCommerceStack showStrip={false} showBrands={!hasBrandsStrip} />,
      });
    }
  } else if (!hasCategoryStrip && !hasCategoriesShowcase) {
    /* Mega blocks exist but no categories beat → append the icon strip */
    fallbackBlocks.push({
      key: "fallback-categories",
      node: (
        <CategoryIconStrip
          previewSpots={resolveCategoryStripItems(catalog.categories, locale, undefined, home.spotlights)}
        />
      ),
    });
  }
  if (!hasShowroom) {
    fallbackBlocks.push({ key: "fallback-showroom", node: <StoreGallery /> });
  }

  return (
    <div className={styles.home} style={{ paddingBottom: "var(--fz-section-gap, 48px)" }}>
      {sections.map((sec, idx) => {
        const p = asObj(sec.payload);
        const delay = Math.min(0.12, idx * 0.02);

        switch (sec.type) {
          case "hero": {
            const customHero = buildHeroPreviewFromPayload(
              p,
              locale,
              home.hero.autoplayMs,
              home.hero.scrimOpacity,
              {
                navArrowColor: home.hero.navArrowColor,
                navBoxBackground: home.hero.navBoxBackground,
              },
            );
            return (
              <SectionBlock key={sec.id} delay={delay}>
                {customHero ? (
                  <HeroSlider previewHero={customHero} />
                ) : (
                  <HeroSlider />
                )}
              </SectionBlock>
            );
          }
          case "trust_bar": {
            const customTrust = buildTrustItemsFromPayload(p, locale);
            const trustItems = customTrust ?? home.trustBar;
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <div className={styles.featuresBar} style={trustBarChromeStyle(home)}>
                  <div
                    className={styles.featuresBarBg}
                    style={{ background: home.trustBarBackground }}
                    aria-hidden
                  />
                  <div className={`container ${styles.featuresGrid}`}>
                    {trustItems.map((item) => (
                      <div key={item.id} className={styles.feature}>
                        <LucideByName name={item.iconKey} size={18} className={styles.featureIcon} />
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionBlock>
            );
          }
          case "promo_mega": {
            const stripSpots = resolveCategoryStripItems(catalog.categories, locale, undefined, home.spotlights);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <HomeCommerceStack
                  stripSpots={stripSpots}
                  showStrip={!hasCategoryStrip}
                  showBrands={!hasBrandsStrip}
                  megaPayload={p}
                />
              </SectionBlock>
            );
          }
          case "category_strip": {
            const stripSpots = resolveCategoryStripItems(catalog.categories, locale, p, home.spotlights);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <CategoryIconStrip previewSpots={stripSpots} />
              </SectionBlock>
            );
          }
          case "featured_products":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <FeaturedProductsSection payload={p} locale={locale} />
              </SectionBlock>
            );
          case "brands_strip": {
            const stripTitle = pick(locale, p.titleAr, p.titleEn);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <BrandTicker title={stripTitle.trim() || undefined} />
              </SectionBlock>
            );
          }
          case "banner_slider":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <BannerSlider payload={p} />
              </SectionBlock>
            );
          case "categories_showcase":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <CategoriesShowcase payload={p} />
              </SectionBlock>
            );
          case "promo_grid":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <PromoGrid payload={p} />
              </SectionBlock>
            );
          case "tabbed_products":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <TabbedShowcase config={p} />
              </SectionBlock>
            );
          case "testimonials":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <TestimonialsSection payload={p} />
              </SectionBlock>
            );
          case "faq": {
            const items = Array.isArray(p.items)
              ? p.items
                  .map((raw) => {
                    const it = asObj(raw);
                    return {
                      q: pick(locale, it.qAr, it.qEn),
                      a: pick(locale, it.aAr, it.aEn),
                    };
                  })
                  .filter((x) => x.q.trim() && x.a.trim())
              : [];
            const manual = p.source === "manual" && items.length > 0;
            const faqTitle = pick(locale, p.titleAr, p.titleEn);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <FAQSection
                  mode={manual ? "custom" : "i18n"}
                  items={manual ? items : undefined}
                  titleOverride={faqTitle.trim() || undefined}
                />
              </SectionBlock>
            );
          }
          case "cta":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <CtaSection payload={p} />
              </SectionBlock>
            );
          case "split_richtext":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <SplitRichtext payload={p} />
              </SectionBlock>
            );
          case "showroom":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <StoreGallery />
              </SectionBlock>
            );
          default:
            return null;
        }
      })}
      {fallbackBlocks.map((block, i) => (
        <SectionBlock key={block.key} delay={0.06 + i * 0.02}>
          {block.node}
        </SectionBlock>
      ))}
    </div>
  );
}
