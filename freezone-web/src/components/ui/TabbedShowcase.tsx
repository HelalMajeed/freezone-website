"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import styles from "./TabbedShowcase.module.css";
import { ProductCard } from "./ProductCard";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { Link } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import {
  parseTabbedProductsPayload,
  getProductsForTab,
  defaultViewAllHrefForTab,
  type TabbedProductTabConfig,
} from "@/lib/home-section-products";
import { productBelongsToCategory } from "@/lib/productCategoryMembership";

type LegacyTabId = "new" | "featured" | "gaming" | "components";

const LEGACY_TABS: { id: LegacyTabId; key: string }[] = [
  { id: "new", key: "tabNew" },
  { id: "featured", key: "tabFeatured" },
  { id: "gaming", key: "tabGaming" },
  { id: "components", key: "tabComponents" },
];

type Props = {
  /** Published CMS payload for `tabbed_products` — when set, drives tabs and copy */
  config?: unknown;
};

export function TabbedShowcase({ config }: Props) {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { catalog, home } = useStorefront();
  const PRODUCTS = catalog.products;
  const pc = home.pageCopy;
  const ar = locale === "ar";

  const cms = useMemo(() => parseTabbedProductsPayload(config), [config]);

  const legacyEyebrow =
    (ar ? pc?.discoverEyebrowAr?.trim() : pc?.discoverEyebrowEn?.trim()) ||
    (ar ? pc?.discoverEyebrowEn?.trim() : pc?.discoverEyebrowAr?.trim());
  const legacyTitle =
    (ar ? pc?.discoverTitleAr?.trim() : pc?.discoverTitleEn?.trim()) ||
    (ar ? pc?.discoverTitleEn?.trim() : pc?.discoverTitleAr?.trim());

  const eyebrow = cms
    ? (ar ? cms.eyebrowAr?.trim() || cms.eyebrowEn?.trim() : cms.eyebrowEn?.trim() || cms.eyebrowAr?.trim()) ||
      legacyEyebrow
    : legacyEyebrow;
  const discoverTitle = cms
    ? (ar ? cms.titleAr?.trim() || cms.titleEn?.trim() : cms.titleEn?.trim() || cms.titleAr?.trim()) || legacyTitle
    : legacyTitle;

  const cmsTabs: TabbedProductTabConfig[] | null = cms?.tabs ?? null;
  const tabStyle = cms?.tabStyle ?? "separated";
  const limit = cms?.limit;

  const [legacyActive, setLegacyActive] = useState<LegacyTabId>("new");
  const [pickedCmsTabId, setPickedCmsTabId] = useState<string | null>(null);

  const effectiveCmsTabId = useMemo(() => {
    if (!cmsTabs?.length) return null;
    if (pickedCmsTabId && cmsTabs.some((t) => t.id === pickedCmsTabId)) return pickedCmsTabId;
    return cmsTabs[0].id;
  }, [cmsTabs, pickedCmsTabId]);

  const activeCmsTab = cmsTabs?.find((x) => x.id === effectiveCmsTabId) ?? cmsTabs?.[0];
  const scrollRef = useRef<HTMLDivElement>(null);

  const getFiltered = () => {
    if (cmsTabs && activeCmsTab) {
      return getProductsForTab(PRODUCTS, activeCmsTab, limit);
    }
    switch (legacyActive) {
      case "new":
        return PRODUCTS.filter((p) => p.isNew).slice(0, 24);
      case "featured":
        return PRODUCTS.filter((p) => p.featured).slice(0, 24);
      case "gaming":
        return PRODUCTS.filter((p) =>
          ["gaming", "laptops", "computers"].some((slug) => productBelongsToCategory(p, slug)),
        ).slice(0, 24);
      case "components":
        return PRODUCTS.filter(
          (p) => productBelongsToCategory(p, "components") || productBelongsToCategory(p, "storage"),
        ).slice(0, 24);
      default:
        return PRODUCTS.slice(0, 24);
    }
  };

  const viewAllHref = (() => {
    const fallback = typeof cms?.viewAllLink === "string" ? cms.viewAllLink : "/products";
    if (cmsTabs && activeCmsTab) {
      return defaultViewAllHrefForTab(activeCmsTab, fallback);
    }
    if (legacyActive === "gaming") return "/products?cat=gaming";
    return fallback;
  })();

  const step = typeof window !== "undefined" && window.innerWidth < 768 ? 260 : 320;

  const scrollPrev = () => {
    scrollRef.current?.scrollBy({ left: -step, behavior: "smooth" });
  };

  const scrollNext = () => {
    scrollRef.current?.scrollBy({ left: step, behavior: "smooth" });
  };

  const activeKey = cmsTabs ? (effectiveCmsTabId ?? "") : legacyActive;

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = 0;
  }, [activeKey]);

  const tabLabel = (tab: TabbedProductTabConfig) => (ar ? tab.labelAr || tab.labelEn : tab.labelEn || tab.labelAr);

  const tabsScrollClass =
    tabStyle === "grouped"
      ? `${styles.tabsScroll} ${styles.tabsScrollGrouped}`
      : styles.tabsScroll;

  return (
    <section className={styles.wrapper}>
      <div className={styles.sectionInner}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.eyebrow}>
              <span className={styles.eyebrowLine} />
              {eyebrow || t("featuredProducts")}
              <span className={styles.eyebrowLine} />
            </div>
            <h2 className={styles.title}>{discoverTitle || t("discoverTech")}</h2>
          </div>

          <div className={styles.tabsBar}>
            {tabStyle === "grouped" ? (
              <div className={styles.tabsGroupedShell}>
                <div className={tabsScrollClass} role="tablist" aria-label={eyebrow || t("featuredProducts")}>
                  {cmsTabs
                    ? cmsTabs.map((tab) => (
                        <motion.button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={effectiveCmsTabId === tab.id}
                          onClick={() => setPickedCmsTabId(tab.id)}
                          className={`${styles.tabGrouped} ${effectiveCmsTabId === tab.id ? styles.activeTabGrouped : ""}`}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        >
                          {tabLabel(tab)}
                        </motion.button>
                      ))
                    : LEGACY_TABS.map((tab) => (
                        <motion.button
                          key={tab.id}
                          type="button"
                          role="tab"
                          aria-selected={legacyActive === tab.id}
                          onClick={() => setLegacyActive(tab.id)}
                          className={`${styles.tabGrouped} ${legacyActive === tab.id ? styles.activeTabGrouped : ""}`}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        >
                          {t(tab.key as "tabNew")}
                        </motion.button>
                      ))
                }
                </div>
              </div>
            ) : (
              <div className={tabsScrollClass} role="tablist" aria-label={eyebrow || t("featuredProducts")}>
                {cmsTabs
                  ? cmsTabs.map((tab) => (
                      <motion.button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={effectiveCmsTabId === tab.id}
                        onClick={() => setPickedCmsTabId(tab.id)}
                        className={`${styles.tab} ${effectiveCmsTabId === tab.id ? styles.activeTab : ""}`}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      >
                        {tabLabel(tab)}
                      </motion.button>
                    ))
                  : LEGACY_TABS.map((tab) => (
                      <motion.button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={legacyActive === tab.id}
                        onClick={() => setLegacyActive(tab.id)}
                        className={`${styles.tab} ${legacyActive === tab.id ? styles.activeTab : ""}`}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      >
                        {t(tab.key as "tabNew")}
                      </motion.button>
                    ))
                }
              </div>
            )}
            <div className={styles.tabsBarActions}>
              <Link href={viewAllHref} className={styles.toolbarViewAll}>
                {t("viewAllProducts")} <ChevronRight size={16} />
              </Link>
              <div className={styles.navButtons}>
                <motion.button
                  type="button"
                  className={styles.navBtn}
                  onClick={scrollPrev}
                  aria-label="Previous products"
                  whileTap={{ scale: 0.92 }}
                >
                  <ChevronLeft size={20} />
                </motion.button>
                <motion.button
                  type="button"
                  className={styles.navBtn}
                  onClick={scrollNext}
                  aria-label="Next products"
                  whileTap={{ scale: 0.92 }}
                >
                  <ChevronRight size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={String(activeKey)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28 }}
            className={styles.trackWrapper}
          >
            <div className={styles.track} ref={scrollRef}>
              {getFiltered().map((p, i) => (
                <div key={p.id} className={styles.slide}>
                  <ProductCard product={p} delay={i * 35} />
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
