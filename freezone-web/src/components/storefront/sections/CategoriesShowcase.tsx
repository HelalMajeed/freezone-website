"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/navigation";
import { useLocale } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { GamingCategoriesGrid } from "@/components/ui/GamingCategoriesGrid";
import { ResponsiveImage } from "@/components/ui/ResponsiveImage";
import styles from "./CategoriesShowcase.module.css";

/** FROZEN payload — see fz-ws1-backend/docs/API_CONTRACTS.md §(j) `categories_showcase`. */
type ShowcaseItem = {
  id: string;
  label: string;
  imageUrl: string;
  href: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(locale: "en" | "ar", ar: unknown, en: unknown): string {
  return locale === "ar" ? str(ar) || str(en) : str(en) || str(ar);
}

export function CategoriesShowcase({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const { catalog } = useStorefront();

  /** `gaming_grid` keeps the legacy preset grid */
  if (payload.source === "gaming_grid") return <GamingCategoriesGrid />;

  const title =
    pick(locale, payload.titleAr, payload.titleEn) ||
    (locale === "ar" ? "تسوق حسب القسم" : "Shop by category");

  const items: ShowcaseItem[] = [];
  if (Array.isArray(payload.items)) {
    for (let i = 0; i < payload.items.length && items.length < 12; i++) {
      const raw = payload.items[i];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const it = raw as Record<string, unknown>;
      const slug = str(it.categorySlug).trim();
      const cat = slug ? catalog.categories.find((c) => c.id === slug) : undefined;
      const label = pick(locale, it.labelAr, it.labelEn) || cat?.name || "";
      const imageUrl = str(it.imageUrl).trim() || cat?.img?.trim() || "";
      const href =
        str(it.href).trim() || (slug ? `/products?cat=${encodeURIComponent(slug)}` : "");
      if (!label || !href) continue;
      items.push({ id: str(it.id) || `cat-${i}`, label, imageUrl, href });
    }
  }

  if (items.length < 2) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.head}>
        <h2 className="fz-type-h2">{title}</h2>
      </div>
      <div className={styles.grid}>
        {items.map((item) => (
          <Link key={item.id} href={item.href} className={styles.card} prefetch>
            {item.imageUrl ? (
              <ResponsiveImage
                src={item.imageUrl}
                alt=""
                className={styles.image}
                sizes="(max-width: 640px) 50vw, 25vw"
              />
            ) : null}
            <div className={styles.scrim} aria-hidden />
            <div className={styles.label}>
              <span className={`fz-type-h4 ${styles.labelText}`}>{item.label}</span>
              <ArrowRight size={16} className={styles.labelArrow} aria-hidden />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
