"use client";

import { useState, useCallback } from "react";
import type { Category } from "@/lib/data";
import styles from "./FilterSidebar.module.css";
import { Filter, ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import type { Product } from "@/lib/data";
import {
  facetDefinitionsForCategory,
  facetDefinitionDisplayTitle,
  collectFacetValueCounts,
  collectBrandCounts,
} from "@/lib/productFacetConfig";

export type ListingAge = "all" | "new" | "older";

export interface FilterState {
  cat: string;
  /** ماركات متعددة */
  brands: string[];
  pMin: string;
  pMax: string;
  inStock: boolean;
  listingAge: ListingAge;
  onSale: boolean;
  featured: boolean;
  /** Facet key → selected display values (multi-select). */
  specSelections: Record<string, string[]>;
}

interface FilterSidebarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  clearFilters: () => void;
  products: Product[];
  categories: Category[];
}

function AccordionSection({
  id,
  title,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.accordion}>
      <button type="button" className={styles.accordionHead} onClick={onToggle} aria-expanded={isOpen} aria-controls={`facet-${id}`} id={`head-${id}`}>
        <span className={styles.accordionTitle}>{title}</span>
        <ChevronDown size={18} className={`${styles.accordionIcon} ${isOpen ? styles.accordionIconOpen : ""}`} aria-hidden />
      </button>
      <div
        id={`facet-${id}`}
        role="region"
        aria-labelledby={`head-${id}`}
        className={styles.accordionPanel}
        hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}

export function FilterSidebar({ filters, setFilters, clearFilters, products, categories }: FilterSidebarProps) {
  const t = useTranslations("Products");
  const locale = useLocale();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = useCallback((key: string) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const updateFilter = <K extends keyof FilterState>(k: K, v: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [k]: v }));
  };

  const activeCat = filters.cat;
  const categoryMeta = categories.find((c) => c.id === activeCat);
  const facetDefs = facetDefinitionsForCategory(
    activeCat,
    categoryMeta?.facetAttributes?.length ? categoryMeta.facetAttributes : categoryMeta?.facetKeys ?? null,
  );

  const brandOptions = collectBrandCounts(products, activeCat);

  const toggleSpecValue = (facetKey: string, value: string) => {
    setFilters((prev) => {
      const cur = prev.specSelections[facetKey] ?? [];
      const has = cur.includes(value);
      const nextVals = has ? cur.filter((x) => x !== value) : [...cur, value];
      const nextSpecs = { ...prev.specSelections };
      if (nextVals.length === 0) delete nextSpecs[facetKey];
      else nextSpecs[facetKey] = nextVals;
      return { ...prev, specSelections: nextSpecs };
    });
  };

  const toggleBrand = (brand: string) => {
    setFilters((prev) => {
      const cur = prev.brands;
      const has = cur.includes(brand);
      const next = has ? cur.filter((b) => b !== brand) : [...cur, brand];
      return { ...prev, brands: next };
    });
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.title}>
          <Filter size={18} strokeWidth={2.25} aria-hidden />
          <span>{t("filterTitle")}</span>
        </div>
        <button type="button" className={styles.clearBtn} onClick={clearFilters}>
          {t("clearFilters")}
        </button>
      </div>

      {!activeCat ? <p className={styles.hint}>{t("filterSpecsHint")}</p> : null}

      {facetDefs.map((def) => {
        const options = collectFacetValueCounts(products, activeCat, def.key);
        if (options.length === 0) return null;
        const selected = filters.specSelections[def.key] ?? [];
        const facetTitle = facetDefinitionDisplayTitle(def, locale, (k, o) => t(k, o));
        const open = openSections[`spec-${def.key}`] ?? false;
        return (
          <AccordionSection
            key={def.key}
            id={`spec-${def.key}`}
            title={facetTitle}
            isOpen={open}
            onToggle={() => toggleSection(`spec-${def.key}`)}
          >
            <div className={styles.facetList}>
              {options.map(({ value: opt, count }) => {
                const isOn = selected.includes(opt);
                return (
                  <label key={opt} className={styles.facetRow}>
                    <input
                      type="checkbox"
                      checked={isOn}
                      onChange={() => toggleSpecValue(def.key, opt)}
                    />
                    <span className={styles.facetLabel}>{opt}</span>
                    <span className={styles.facetCount}>{count}</span>
                  </label>
                );
              })}
            </div>
          </AccordionSection>
        );
      })}

      {brandOptions.length > 0 && (
        <AccordionSection
          id="brands"
          title={t("brandsInDepartment")}
          isOpen={openSections.brands ?? false}
          onToggle={() => toggleSection("brands")}
        >
          <div className={styles.facetList}>
            {brandOptions.map(({ value: b, count }) => {
              const isOn = filters.brands.includes(b);
              return (
                <label key={b} className={styles.facetRow}>
                  <input type="checkbox" checked={isOn} onChange={() => toggleBrand(b)} />
                  <span className={styles.facetLabel}>{b}</span>
                  <span className={styles.facetCount}>{count}</span>
                </label>
              );
            })}
          </div>
        </AccordionSection>
      )}

      <AccordionSection
        id="price"
        title={t("priceRange")}
        isOpen={openSections.price ?? false}
        onToggle={() => toggleSection("price")}
      >
        <div className={styles.priceInputs}>
          <input
            type="number"
            placeholder={t("priceMin")}
            value={filters.pMin}
            onChange={(e) => updateFilter("pMin", e.target.value)}
          />
          <input
            type="number"
            placeholder={t("priceMax")}
            value={filters.pMax}
            onChange={(e) => updateFilter("pMax", e.target.value)}
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="listing"
        title={t("listingAge")}
        isOpen={openSections.listing ?? false}
        onToggle={() => toggleSection("listing")}
      >
        <div className={styles.radioGroup}>
          {(
            [
              ["all", t("listingAll")],
              ["new", t("listingNew")],
              ["older", t("listingOlder")],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className={styles.radioRow}>
              <input
                type="radio"
                name="listingAge"
                checked={filters.listingAge === val}
                onChange={() => updateFilter("listingAge", val)}
              />
              {label}
            </label>
          ))}
        </div>
      </AccordionSection>

      <div className={styles.checkboxGroup}>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={filters.onSale} onChange={(e) => updateFilter("onSale", e.target.checked)} />
          {t("onSale")}
        </label>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={filters.inStock} onChange={(e) => updateFilter("inStock", e.target.checked)} />
          {t("inStock")}
        </label>
        <label className={styles.checkboxLabel}>
          <input type="checkbox" checked={filters.featured} onChange={(e) => updateFilter("featured", e.target.checked)} />
          {t("featured")}
        </label>
      </div>
    </aside>
  );
}
