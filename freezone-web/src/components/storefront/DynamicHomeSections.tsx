"use client";

import type { ReactNode } from "react";
import { useLocale } from "@/i18n/hooks";
import type { StorefrontCmsSection } from "@/lib/cms-page-storefront";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import styles from "@/app/locale/page.module.css";
import { HeroSlider } from "@/components/ui/HeroSlider";
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
import { MotionReveal } from "@/components/motion/MotionReveal";
import { Link } from "@/navigation";
import { resolveFeaturedProductList } from "@/lib/home-section-products";
import {
  buildCategorySpotsFromPayload,
  buildHeroPreviewFromPayload,
  buildTrustItemsFromPayload,
} from "@/lib/home-section-custom-payload";
import { trustBarChromeStyle } from "@/lib/layout-cms";

function asObj(p: unknown): Record<string, unknown> {
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Record<string, unknown>) : {};
}

function pickTitle(payload: Record<string, unknown>, locale: string) {
  const ar = typeof payload.titleAr === "string" ? payload.titleAr : "";
  const en = typeof payload.titleEn === "string" ? payload.titleEn : "";
  return locale === "ar" ? ar || en : en || ar;
}

function pickSecondary(
  payload: Record<string, unknown>,
  locale: string,
  arKey: string,
  enKey: string,
): string | undefined {
  const ar = typeof payload[arKey] === "string" ? (payload[arKey] as string).trim() : "";
  const en = typeof payload[enKey] === "string" ? (payload[enKey] as string).trim() : "";
  if (locale === "ar") return ar || en || undefined;
  return en || ar || undefined;
}

function SectionBlock({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return <MotionReveal delay={delay}>{children}</MotionReveal>;
}

export function DynamicHomeSections({ sections }: { sections: StorefrontCmsSection[] }) {
  const locale = useLocale() as "en" | "ar";
  const { home, catalog } = useStorefront();
  const { products } = catalog;

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
          case "category_strip": {
            const customSpots = buildCategorySpotsFromPayload(p, locale);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <CategoryIconStrip previewSpots={customSpots ?? undefined} />
              </SectionBlock>
            );
          }
          case "featured_products": {
            const title = pickTitle(p, locale) || (locale === "ar" ? "منتجات" : "Products");
            const link = typeof p.link === "string" ? p.link : "/products";
            const filter = typeof p.filter === "string" ? p.filter : "new";
            const catSlug = typeof p.catSlug === "string" ? p.catSlug : undefined;
            const limit = typeof p.limit === "number" ? p.limit : 12;
            const productIds = Array.isArray(p.productIds)
              ? (p.productIds as unknown[]).map((x) => Number(x)).filter((n) => Number.isFinite(n))
              : undefined;
            const list = resolveFeaturedProductList(products, filter, catSlug, limit, productIds);
            const viewAllLabel = pickSecondary(p, locale, "viewAllAr", "viewAllEn");
            const ctaVariant = p.ctaVariant === "teal" ? "teal" : "gray";
            const bgColor = typeof p.bgColor === "string" ? p.bgColor : "var(--gray-50)";
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <ProductSlider
                  title={title}
                  link={link}
                  products={list}
                  viewAllLabel={viewAllLabel}
                  ctaVariant={ctaVariant}
                  bgColor={bgColor}
                />
              </SectionBlock>
            );
          }
          case "brands_strip": {
            const title = pickTitle(p, locale);
            return (
              <SectionBlock key={sec.id} delay={delay}>
                {title ? (
                  <div className="container" style={{ marginBottom: 12 }}>
                    <h2 style={{ fontSize: "1.25rem", fontWeight: 800 }}>{title}</h2>
                  </div>
                ) : null}
                <BrandTicker />
              </SectionBlock>
            );
          }
          case "banner_slider": {
            const items = Array.isArray(p.items) ? p.items : [];
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <section className="container" style={{ padding: "24px 16px", overflowX: "auto" }}>
                  <div style={{ display: "flex", gap: 16, minHeight: 200 }}>
                    {items.map((raw, i) => {
                      const it = asObj(raw);
                      const img = typeof it.imageUrl === "string" ? it.imageUrl : "";
                      const href = typeof it.href === "string" ? it.href : "/products";
                      const tit = pickTitle(it, locale);
                      if (!img) return null;
                      return (
                        <div key={i} style={{ flex: "0 0 min(85vw, 420px)" }}>
                          <PromoBanner title={tit || "—"} link={href} image={img} />
                        </div>
                      );
                    })}
                  </div>
                </section>
              </SectionBlock>
            );
          }
          case "categories_showcase":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <GamingCategoriesGrid />
              </SectionBlock>
            );
          case "promo_mega":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <PromoMegaBlocks payload={p} />
              </SectionBlock>
            );
          case "promo_grid": {
            const items = Array.isArray(p.items) ? p.items : [];
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <section
                  className="container"
                  style={{
                    padding: "40px clamp(16px, 5%, 60px)",
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                    gap: 20,
                  }}
                >
                  {items.map((raw, i) => {
                    const it = asObj(raw);
                    const img = typeof it.imageUrl === "string" ? it.imageUrl : "";
                    const href = typeof it.href === "string" ? it.href : "/products";
                    const tit = pickTitle(it, locale);
                    if (!img) return null;
                    return <PromoBanner key={i} title={tit || "—"} link={href} image={img} />;
                  })}
                </section>
              </SectionBlock>
            );
          }
          case "tabbed_products":
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <TabbedShowcase config={sec.payload} />
              </SectionBlock>
            );
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
          case "faq": {
            if (p.source === "i18n" || !Array.isArray(p.items)) {
              return (
                <SectionBlock key={sec.id} delay={delay}>
                  <FAQSection />
                </SectionBlock>
              );
            }
            const faqItems = (p.items as unknown[]).map((raw) => {
              const it = asObj(raw);
              const q =
                locale === "ar" ? String(it.qAr ?? it.qEn ?? "") : String(it.qEn ?? it.qAr ?? "");
              const a =
                locale === "ar" ? String(it.aAr ?? it.aEn ?? "") : String(it.aEn ?? it.aAr ?? "");
              return { q, a };
            });
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <FAQSection mode="custom" items={faqItems.filter((x) => x.q && x.a)} />
              </SectionBlock>
            );
          }
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
            return (
              <SectionBlock key={sec.id} delay={delay}>
                <StoreGallery />
              </SectionBlock>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
