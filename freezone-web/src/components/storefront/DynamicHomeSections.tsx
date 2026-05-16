"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/hooks";
import type { StorefrontCmsSection } from "@/lib/cms-page-storefront";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import styles from "@/app/locale/page.module.css";
import { HeroSlider } from "@/components/ui/HeroSlider";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { LucideByName } from "@/lib/lucide-icon-map";
import { MotionReveal } from "@/components/motion/MotionReveal";
import { Link } from "@/navigation";
import { HomeCatalogShowcase } from "@/components/storefront/HomeCatalogShowcase";
import {
  buildHeroPreviewFromPayload,
  buildTrustItemsFromPayload,
  resolveCategoryStripItems,
} from "@/lib/home-section-custom-payload";
import { trustBarChromeStyle } from "@/lib/layout-cms";

function asObj(p: unknown): Record<string, unknown> {
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function SectionBlock({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <MotionReveal delay={delay}>{children}</MotionReveal>;
}

export function DynamicHomeSections({ sections }: { sections: StorefrontCmsSection[] }) {
  const locale = useLocale() as "en" | "ar";
  const { home, catalog } = useStorefront();
  const hasPromoMega = sections.some((s) => s.type === "promo_mega");
  const hasCategoryStrip = sections.some((s) => s.type === "category_strip");

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
                {!hasCategoryStrip ? <CategoryIconStrip previewSpots={stripSpots} /> : null}
                <PromoMegaBlocks payload={p} />
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
          case "brands_strip":
          case "banner_slider":
          case "categories_showcase":
          case "promo_grid":
          case "tabbed_products":
            return null;
          case "testimonials": {
            const items = Array.isArray(p.items) ? p.items : [];
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <section className="container" style={{ padding: "48px 16px" }}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {items.map((raw, i) => {
                      const it = asObj(raw);
                      const text =
                        locale === "ar"
                          ? String(it.textAr ?? it.textEn ?? "")
                          : String(it.textEn ?? it.textAr ?? "");
                      const name =
                        locale === "ar"
                          ? String(it.nameAr ?? it.nameEn ?? "")
                          : String(it.nameEn ?? it.nameAr ?? "");
                      if (!text) return null;
                      return (
                        <div
                          key={i}
                          style={{
                            background: "var(--fz-surface, #f8fafc)",
                            borderRadius: "var(--fz-radius-card, 12px)",
                            padding: 20,
                            boxShadow: "var(--fz-shadow-card)",
                          }}
                        >
                          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 12 }}>{text}</p>
                          <strong style={{ fontSize: 13 }}>{name}</strong>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </SectionBlock>
            );
          }
          case "faq":
            return null;
          case "cta": {
            const title =
              locale === "ar" ? String(p.titleAr ?? p.titleEn ?? "") : String(p.titleEn ?? p.titleAr ?? "");
            const subtitle =
              locale === "ar" ? String(p.subtitleAr ?? p.subtitleEn ?? "") : String(p.subtitleEn ?? p.subtitleAr ?? "");
            const btn =
              locale === "ar" ? String(p.buttonAr ?? p.buttonEn ?? "") : String(p.buttonEn ?? p.buttonAr ?? "");
            const href = typeof p.href === "string" ? p.href : "/products";
            const bg = typeof p.bg === "string" ? p.bg : "#0f172a";
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <section className="container" style={{ padding: "32px 16px" }}>
                  <div
                    style={{
                      background: bg,
                      color: "#fff",
                      borderRadius: "var(--fz-radius-card, 12px)",
                      padding: "40px 28px",
                      textAlign: "center",
                    }}
                  >
                    {title ? <h2 style={{ fontSize: "1.5rem", marginBottom: 12 }}>{title}</h2> : null}
                    {subtitle ? <p style={{ opacity: 0.9, marginBottom: 20 }}>{subtitle}</p> : null}
                    <Link href={href} className="btn-primary" style={{ display: "inline-block", padding: "12px 28px" }}>
                      {btn || href}
                    </Link>
                  </div>
                </section>
              </SectionBlock>
            );
          }
          case "split_richtext": {
            const title =
              locale === "ar" ? String(p.titleAr ?? p.titleEn ?? "") : String(p.titleEn ?? p.titleAr ?? "");
            const body =
              locale === "ar" ? String(p.bodyAr ?? p.bodyEn ?? "") : String(p.bodyEn ?? p.bodyAr ?? "");
            const imageUrl = typeof p.imageUrl === "string" ? p.imageUrl : "";
            const imageSide = p.imageSide === "left" ? "left" : "right";
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <section className="container" style={{ padding: "40px 16px" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: imageSide === "left" ? "row-reverse" : "row",
                      flexWrap: "wrap",
                      gap: 28,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: "1 1 280px" }}>
                      {title ? <h2 style={{ fontSize: "1.35rem", marginBottom: 12 }}>{title}</h2> : null}
                      <p style={{ lineHeight: 1.7, color: "#475569" }}>{body}</p>
                    </div>
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt=""
                        style={{
                          flex: "1 1 280px",
                          maxWidth: "100%",
                          borderRadius: "var(--fz-radius-card, 12px)",
                          objectFit: "cover",
                        }}
                      />
                    ) : null}
                  </div>
                </section>
              </SectionBlock>
            );
          }
          case "showroom":
            return null;
          default:
            return null;
        }
      })}
      {!hasCategoryStrip && !hasPromoMega ? (
        <SectionBlock delay={0.06}>
          <HomeCatalogShowcase />
        </SectionBlock>
      ) : !hasPromoMega ? (
        <SectionBlock delay={0.08}>
          <PromoMegaBlocks />
        </SectionBlock>
      ) : !hasCategoryStrip ? (
        <SectionBlock delay={0.08}>
          <CategoryIconStrip
            previewSpots={resolveCategoryStripItems(catalog.categories, locale, undefined, home.spotlights)}
          />
        </SectionBlock>
      ) : null}
    </div>
  );
}
