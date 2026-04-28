"use client";

import { useState, useMemo, useEffect } from "react";
import { useTranslations } from "@/i18n/hooks";
import { useReducedMotion } from "framer-motion";
import { Link } from "@/navigation";
import styles from "./BrandTicker.module.css";
import { BRANDS } from "@/lib/data";
import { useStorefront } from "@/components/providers/StorefrontProvider";

type BrandRow = { name: string; img: string | null };

/** Slug for /public/brands/{slug}.svg and Simple Icons CDN (lowercase a-z0-9). */
function brandSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * URLs to try in order: admin URL, local SVG, then Simple Icons (when slug is known).
 * DB rows often omit `img`; product-derived names still get logos via local/CDN.
 */
function logoCandidateUrls(name: string, explicitImg: string | null): string[] {
  const out: string[] = [];
  const push = (u: string) => {
    const t = u.trim();
    if (t && !out.includes(t)) out.push(t);
  };
  if (explicitImg?.trim()) push(explicitImg.trim());
  const slug = brandSlug(name);
  if (slug.length >= 2) {
    push(`/brands/${slug}.svg`);
    // Grayscale wordmark; works for most tech brands when no local asset exists
    push(`https://cdn.simpleicons.org/${slug}/374151`);
  }
  return out;
}

function BrandLogo({ name, explicitImg }: { name: string; explicitImg: string | null }) {
  const candidates = useMemo(() => logoCandidateUrls(name, explicitImg), [name, explicitImg]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [name, explicitImg]);

  if (candidates.length === 0 || index >= candidates.length) {
    return <span className={styles.brandName}>{name}</span>;
  }

  return (
    <img
      src={candidates[index]}
      alt={name}
      className={styles.brandImg}
      loading="lazy"
      decoding="async"
      onError={() => setIndex((i) => i + 1)}
    />
  );
}

function MarqueeRow({
  brands,
  direction,
}: {
  brands: BrandRow[];
  direction: "left" | "right";
}) {
  const reduceMotion = useReducedMotion();
  const sequence = reduceMotion ? brands : [...brands, ...brands];
  const trackClass = reduceMotion
    ? styles.marqueeTrackStatic
    : direction === "left"
      ? styles.marqueeTrackLeft
      : styles.marqueeTrackRight;

  return (
    <div className={styles.marqueeViewport}>
      <div className={trackClass}>
        {sequence.map((brand, i) => (
          <Link
            href={`/products?brand=${encodeURIComponent(brand.name)}`}
            key={`${brand.name}-${i}`}
            className={styles.brandCircle}
          >
            <BrandLogo name={brand.name} explicitImg={brand.img} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BrandTicker() {
  const t = useTranslations("Home");
  const { catalog } = useStorefront();
  const brands = useMemo<BrandRow[]>(() => {
    if (catalog.brands.length > 0) {
      // `img` may be null in DB — BrandLogo still tries /brands/{slug}.svg + CDN
      return catalog.brands.map((b) => ({ name: b.name, img: b.img }));
    }
    const seen = new Set<string>();
    const out: BrandRow[] = [];
    for (const p of catalog.products) {
      const name = p.brand?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      out.push({ name, img: null });
    }
    if (out.length > 0) return out;
    return BRANDS.map((b) => ({ name: b.name, img: b.img }));
  }, [catalog.brands, catalog.products]);

  const mid = Math.ceil(brands.length / 2);
  const rowA = brands.slice(0, mid);
  const rowB = brands.slice(mid);

  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.header}>
          <h2 className={styles.title}>{t("popularBrands")}</h2>
        </div>
      </div>

      <div className={styles.tickerSection}>
        {rowA.length > 0 && <MarqueeRow brands={rowA} direction="left" />}
        {rowB.length > 0 && <MarqueeRow brands={rowB} direction="right" />}
      </div>
    </section>
  );
}
