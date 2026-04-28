"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { HeroSlider } from "@/components/ui/HeroSlider";
import { CategoryIconStrip } from "@/components/ui/CategoryIconStrip";
import { GamingCategoriesGrid } from "@/components/ui/GamingCategoriesGrid";
import { PromoMegaBlocks } from "@/components/ui/PromoMegaBlocks";
import { PromoBanner } from "@/components/ui/PromoBanner";
import { StoreGallery } from "@/components/ui/StoreGallery";
import { FAQSection } from "@/components/ui/FAQSection";
import { ProductSlider } from "@/components/ui/ProductSlider";
import { CategoryPromoBlock } from "@/components/ui/CategoryPromoBlock";
import { BrandTicker } from "@/components/ui/BrandTicker";
import { TabbedShowcase } from "@/components/ui/TabbedShowcase";
import { SiteLogo } from "@/components/layout/SiteLogo";
import { LucideByName } from "@/lib/lucide-icon-map";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { MotionReveal } from "@/components/motion/MotionReveal";
import type { CmsEditorTab } from "@/lib/cms-editor-tab";
import styles from "@/app/admin/(secure)/cms/cms.module.css";
import { TopBarSocialIcons } from "@/components/layout/TopBarSocialIcons";
import { trustBarChromeStyle } from "@/lib/layout-cms";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";

export type { CmsEditorTab };

function PreviewRegion({
  tabKey,
  activeTab,
  label,
  children,
}: {
  tabKey: CmsEditorTab;
  activeTab: string;
  label: string;
  children: ReactNode;
}) {
  const on = activeTab === tabKey;
  return (
    <div
      className={`${styles.previewRegion} ${on ? styles.previewRegionActive : ""}`}
      data-cms-region={tabKey}
    >
      {on ? (
        <div className={styles.previewRegionBadge}>
          <span className={styles.previewRegionArrow} aria-hidden>
            ←
          </span>
          <span>{label}</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function CmsPreviewTopBarStrip() {
  const { site } = useStorefront();
  const promoText =
    site.promoBarEnabled && site.promoBarText?.trim() ? site.promoBarText : "—";
  return (
    <div
      className={styles.previewTopBar}
      style={{ background: site.topBarBgColor }}
      title="معاينة الشريط العلوي الداكن"
    >
      <div className={styles.previewTopBarInner}>
        <div className={styles.previewTopBarContact} style={{ color: site.topBarContactColor }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <LucideByName name={site.topBarPhoneIconKey} size={12} />
            {site.topBarPhoneLabel}
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <LucideByName name={site.topBarWhatsappIconKey} size={12} />
            {site.topBarWhatsappLabel}
          </span>
        </div>
        <div className={styles.previewTopBarPromo} style={{ color: site.topBarPromoColor }}>
          <LucideByName name={site.topBarPromoIconKey} size={14} />
          <span>{promoText}</span>
        </div>
        <TopBarSocialIcons
          links={site.social}
          enabled={site.topBarSocialEnabled}
          iconSizePx={site.topBarSocialIconSizePx}
          gapPx={site.topBarSocialGapPx}
          color={site.topBarSocialColor}
        />
      </div>
    </div>
  );
}

function CmsPreviewMaintenanceRibbon() {
  const { site } = useStorefront();
  if (!site.maintenanceMode) return null;
  return <div className={styles.previewMaintenance}>وضع الصيانة مفعّل في لوحة CMS</div>;
}

function CmsPreviewIdentityHeader() {
  const { site } = useStorefront();
  return (
    <div className={styles.previewIdentityBar}>
      <div className={styles.previewIdentityInner}>
        <SiteLogo variant="navbar" />
        <div className={styles.previewIdentityText}>
          <strong>{site.storeName}</strong>
          <span className={styles.previewIdentityTagline}>{site.tagline}</span>
        </div>
      </div>
    </div>
  );
}

function CmsPreviewFakeNav() {
  return (
    <div className={styles.previewFakeNav} dir="ltr">
      <span>Home</span>
      <span className={styles.previewFakeNavSep}>·</span>
      <span>Laptops</span>
      <span className={styles.previewFakeNavSep}>·</span>
      <span>PC Builder</span>
      <span className={styles.previewFakeNavSep}>·</span>
      <span>Deals</span>
    </div>
  );
}

function CmsPreviewCommerceStrip() {
  const { site } = useStorefront();
  return (
    <div className={styles.previewCommerceStrip}>
      <span>
        توصيل مجاني فوق {site.freeDeliveryThreshold.toLocaleString()} د.ع — شحن قياسي{" "}
        {site.standardShippingFee.toLocaleString()} د.ع
      </span>
    </div>
  );
}

function CmsPreviewSeoNote() {
  const { site } = useStorefront();
  const title = site.metaTitle?.trim() || "—";
  return (
    <div className={styles.previewSeoNote}>
      <strong>SEO — لا يظهر ككتلة مرئية</strong>
      <span>عنوان الميتا: {title}</span>
    </div>
  );
}

function CmsPreviewFooterSplit({ activeTab }: { activeTab: string }) {
  const { site } = useStorefront();
  const contactOn = activeTab === "contact";
  const socialOn = activeTab === "social";

  return (
    <div className={styles.previewFooter}>
      <div
        className={`${styles.previewFooterContact} ${contactOn ? styles.previewRegionActive : ""}`}
        data-cms-region="contact"
      >
        {contactOn ? (
          <div className={styles.previewRegionBadge}>
            <span className={styles.previewRegionArrow} aria-hidden>
              ←
            </span>
            <span>تواصل وعنوان</span>
          </div>
        ) : null}
        <div className={styles.previewFooterRow}>
          <strong>{site.storeName}</strong>
          <span className={styles.previewFooterTagline}>{site.tagline}</span>
        </div>
        <div className={styles.previewFooterRowMuted}>
          <span>{site.phone}</span>
          <span>·</span>
          <span>{site.email}</span>
        </div>
        <div className={styles.previewFooterRowMuted}>{site.address}</div>
      </div>

      <div
        className={`${styles.previewFooterSocialWrap} ${socialOn ? styles.previewRegionActive : ""}`}
        data-cms-region="social"
      >
        {socialOn ? (
          <div className={styles.previewRegionBadge}>
            <span className={styles.previewRegionArrow} aria-hidden>
              ←
            </span>
            <span>وسائل التواصل</span>
          </div>
        ) : null}
        <div className={styles.previewFooterSocial}>
          {site.social.map((s) => (
            <span key={`${s.platform}-${s.sortOrder}`} className={styles.previewFooterSocialBadge}>
              {s.platform}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** معاينة الصفحة الرئيسية للزائر مع إبراز القسم المرتبط بالتبويب المفتوح في المحرّر */
export function CmsVisitorPreview({ activeTab }: { activeTab: CmsEditorTab }) {
  const { home, catalog } = useStorefront();
  const { products } = catalog;
  const t = useTranslations("Home");
  const locale = useLocale();
  const pc = home.pageCopy;
  const ar = locale === "ar";
  const newArrivalsTitle =
    (ar ? pc?.newArrivalsTitleAr?.trim() : pc?.newArrivalsTitleEn?.trim()) ||
    (ar ? pc?.newArrivalsTitleEn?.trim() : pc?.newArrivalsTitleAr?.trim());
  const promoRow1 = home.promoBanners.length >= 3 ? home.promoBanners.slice(0, 3) : null;
  const promoRow2 = home.promoBanners.length >= 6 ? home.promoBanners.slice(3, 6) : null;

  const countCat = (slug: string) => products.filter((p) => productBelongsToCategory(p, slug)).length;

  const pcCategories = [
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
  ];

  return (
    <>
      <PreviewRegion tabKey="identity" activeTab={activeTab} label="الهوية والشعار">
        <CmsPreviewIdentityHeader />
        <CmsPreviewMaintenanceRibbon />
      </PreviewRegion>

      <PreviewRegion tabKey="topBar" activeTab={activeTab} label="الشريط العلوي (هاتف، واتساب، عرض)">
        <CmsPreviewTopBarStrip />
      </PreviewRegion>

      <PreviewRegion tabKey="nav" activeTab={activeTab} label="القائمة">
        <CmsPreviewFakeNav />
      </PreviewRegion>

      <PreviewRegion tabKey="hero" activeTab={activeTab} label="قسم الهيرو">
        <div className={styles.previewHero}>
          <HeroSlider />
        </div>
      </PreviewRegion>

      <PreviewRegion tabKey="commerce" activeTab={activeTab} label="شحن ودفع">
        <CmsPreviewCommerceStrip />
      </PreviewRegion>

      <PreviewRegion tabKey="trust" activeTab={activeTab} label="شريط الثقة">
        <div className={styles.trustPreview} style={trustBarChromeStyle(home)}>
          <div
            className={styles.trustPreviewBg}
            style={{ background: home.trustBarBackground }}
            aria-hidden
          />
          <div className={styles.trustPreviewGrid}>
            {home.trustBar.map((item) => (
              <div key={item.id} className={styles.trustItem}>
                <LucideByName name={item.iconKey} size={14} />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </PreviewRegion>

      <PreviewRegion tabKey="spots" activeTab={activeTab} label="أيقونات الأقسام">
        <CategoryIconStrip />
      </PreviewRegion>

      <PreviewRegion tabKey="products" activeTab={activeTab} label="شبكة الأقسام، وصل حديثاً، مكوّنات PC">
        <MotionReveal>
          <GamingCategoriesGrid />
        </MotionReveal>
        <MotionReveal delay={0.04}>
          <PromoMegaBlocks />
        </MotionReveal>
        <MotionReveal delay={0.06}>
          <ProductSlider
            title={newArrivalsTitle || t("newArrivals")}
            link="/products?isNew=true"
            products={products.filter((p) => p.isNew)}
          />
        </MotionReveal>
        <MotionReveal delay={0.08}>
          <CategoryPromoBlock
            sectionTitle={t("pcComponents")}
            viewAllLink="/products?cat=components"
            bannerImage="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800"
            bannerTitle={t("proPartsDeals")}
            bannerSubtitle={t("buildDreamPc")}
            bannerLink="/products?cat=components"
            categories={pcCategories}
            bottomCta={{
              text: t("pcBuilderWizard"),
              link: "/pc-builder",
            }}
          />
        </MotionReveal>
        <MotionReveal delay={0.05}>
          <BrandTicker />
        </MotionReveal>
      </PreviewRegion>

      <PreviewRegion tabKey="homePage" activeTab={activeTab} label="نصوص: اكتشاف، أسئلة شائعة (عناوين المعرض هنا)">
        <MotionReveal delay={0.06}>
          <TabbedShowcase />
        </MotionReveal>
        <MotionReveal delay={0.06}>
          <FAQSection />
        </MotionReveal>
      </PreviewRegion>

      <PreviewRegion tabKey="promo" activeTab={activeTab} label="بانرات العروض">
        <section
          style={{
            padding: "8px clamp(8px, 3%, 20px)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            gap: "8px",
          }}
        >
          {promoRow1
            ? promoRow1.map((p) => <PromoBanner key={p.id} title={p.title} link={p.href} image={p.imageUrl} />)
            : null}
        </section>
        <section
          style={{
            padding: "0 clamp(8px, 3%, 20px) 12px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
            gap: "8px",
          }}
        >
          {promoRow2
            ? promoRow2.map((p) => <PromoBanner key={p.id} title={p.title} link={p.href} image={p.imageUrl} />)
            : null}
        </section>
      </PreviewRegion>

      <PreviewRegion tabKey="showroom" activeTab={activeTab} label="معرض الصور">
        <StoreGallery />
      </PreviewRegion>

      <PreviewRegion tabKey="seo" activeTab={activeTab} label="SEO (ميتا)">
        <CmsPreviewSeoNote />
      </PreviewRegion>

      <CmsPreviewFooterSplit activeTab={activeTab} />
    </>
  );
}
