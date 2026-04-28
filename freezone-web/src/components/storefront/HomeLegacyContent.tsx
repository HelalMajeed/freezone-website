"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import styles from "@/app/locale/page.module.css";
import { HeroSlider } from "@/components/ui/HeroSlider";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { trustBarChromeStyle } from "@/lib/layout-cms";
import { LucideByName } from "@/lib/lucide-icon-map";
import { BrandTicker } from "@/components/ui/BrandTicker";
import { TabbedShowcase } from "@/components/ui/TabbedShowcase";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { GamingCategoriesGrid } from "@/components/ui/GamingCategoriesGrid";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { PromoBanner } from "@/components/ui/PromoBanner";
import { StoreGallery } from "@/components/ui/StoreGallery";
import { FAQSection } from "@/components/ui/FAQSection";
import { ProductSlider } from "@/components/ui/ProductSlider";
import { CategoryPromoBlock } from "@/components/ui/CategoryPromoBlock";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";

/** Original homepage composition — used when no published CMS sections exist */
export function HomeLegacyContent() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { home, catalog } = useStorefront();
  const { products } = catalog;
  const pc = home.pageCopy;
  const ar = locale === "ar";
  const newArrivalsTitle =
    (ar ? pc?.newArrivalsTitleAr?.trim() : pc?.newArrivalsTitleEn?.trim()) ||
    (ar ? pc?.newArrivalsTitleEn?.trim() : pc?.newArrivalsTitleAr?.trim());

  const promoRow1 = home.promoBanners.length >= 3 ? home.promoBanners.slice(0, 3) : null;
  const promoRow2 = home.promoBanners.length >= 6 ? home.promoBanners.slice(3, 6) : null;

  const countCat = useMemo(
    () => (slug: string) => products.filter((p) => productBelongsToCategory(p, slug)).length,
    [products],
  );

  return (
    <div className={styles.home}>
      <HeroSlider />

      <MotionReveal>
        <div className={styles.featuresBar} style={trustBarChromeStyle(home)}>
          <div
            className={styles.featuresBarBg}
            style={{ background: home.trustBarBackground }}
            aria-hidden
          />
          <div className={`container ${styles.featuresGrid}`}>
            {home.trustBar.map((item) => (
              <div key={item.id} className={styles.feature}>
                <LucideByName name={item.iconKey} size={18} className={styles.featureIcon} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </MotionReveal>

      <CategoryIconStrip />

      <MotionReveal delay={0.04}>
        <GamingCategoriesGrid />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <PromoMegaBlocks />
      </MotionReveal>

      <MotionReveal delay={0.08}>
        <ProductSlider
          title={newArrivalsTitle || t("newArrivals")}
          link="/products?isNew=true"
          products={products.filter((p) => p.isNew)}
        />
      </MotionReveal>

      <MotionReveal delay={0.1}>
        <CategoryPromoBlock
          sectionTitle={t("pcComponents")}
          viewAllLink="/products?cat=components"
          bannerImage="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800"
          bannerTitle={t("proPartsDeals")}
          bannerSubtitle={t("buildDreamPc")}
          bannerLink="/products?cat=components"
          categories={[
            {
              id: "1",
              label: t("processors"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=150",
              link: "/products?cat=components",
            },
            {
              id: "2",
              label: t("graphicsCards"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1587202372634-32705e3bf49c?q=80&w=150",
              link: "/products?cat=components",
            },
            {
              id: "3",
              label: t("motherboards"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=150",
              link: "/products?cat=components",
            },
            {
              id: "4",
              label: t("ram"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?q=80&w=150",
              link: "/products?cat=components",
            },
            {
              id: "5",
              label: t("storage"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1531492746076-161ca9bcad58?q=80&w=150",
              link: "/products?cat=components",
            },
            {
              id: "6",
              label: t("powerSupplies"),
              count: countCat("components"),
              image: "https://images.unsplash.com/photo-1542393545-10f5cde2c810?q=80&w=150",
              link: "/products?cat=components",
            },
          ]}
          bottomCta={{
            text: t("pcBuilderWizard"),
            link: "/pc-builder",
          }}
        />
      </MotionReveal>

      <MotionReveal delay={0.05}>
        <BrandTicker />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <section
          className="container"
          style={{
            padding: "60px clamp(16px, 5%, 60px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {promoRow1
            ? promoRow1.map((p) => (
                <PromoBanner key={p.id} title={p.title} link={p.href} image={p.imageUrl} />
              ))
            : [
                <PromoBanner
                  key="f1"
                  title={t("ultimateGaming")}
                  link="/products?cat=gaming"
                  image="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800"
                />,
                <PromoBanner
                  key="f2"
                  title={t("proMonitors")}
                  link="/products?cat=monitors"
                  image="https://images.unsplash.com/photo-1527443195645-1133f7f28990?q=80&w=800"
                />,
                <PromoBanner
                  key="f3"
                  title={t("newArrivals")}
                  link="/products?featured=true"
                  image="https://images.unsplash.com/photo-1598327105666-5b89351cb31b?q=80&w=800"
                />,
              ]}
        </section>
      </MotionReveal>

      <MotionReveal delay={0.05}>
        <TabbedShowcase />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <section
          className="container"
          style={{
            padding: "0 clamp(16px, 5%, 60px) 60px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
          }}
        >
          {promoRow2
            ? promoRow2.map((p) => (
                <PromoBanner key={p.id} title={p.title} link={p.href} image={p.imageUrl} />
              ))
            : [
                <PromoBanner
                  key="f4"
                  title={t("securitySystems")}
                  link="/products?cat=security"
                  image="https://images.unsplash.com/photo-1557597774-9d273605dfa9?q=80&w=800"
                />,
                <PromoBanner
                  key="f5"
                  title={t("workstations")}
                  link="/products?cat=computers"
                  image="https://images.unsplash.com/photo-1593642702821-c823b8273618?q=80&w=800"
                />,
                <PromoBanner
                  key="f6"
                  title={t("pcParts")}
                  link="/products?cat=components"
                  image="https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?q=80&w=800"
                />,
              ]}
        </section>
      </MotionReveal>

      <MotionReveal delay={0.05}>
        <StoreGallery />
      </MotionReveal>

      <MotionReveal delay={0.06}>
        <FAQSection />
      </MotionReveal>
    </div>
  );
}
