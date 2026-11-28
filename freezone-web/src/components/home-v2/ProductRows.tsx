import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { useCatalog } from "@/site/catalog";
import { useSitePrefs } from "@/site/prefs";
import { GhostCard, ProductCard } from "@/site/ProductCard";
import { Rail } from "@/site/Rail";
import { ForwardArrow } from "./HomeSections";
import { Reveal } from "./Reveal";
import styles from "./HomeV2.module.css";

/**
 * Three rows of five chosen products (one line on desktop, a swipe rail on
 * phones). The ids are catalogue ids (src/site/data); "view all" opens the
 * product list filtered to the row's section. A fourth row, "recently viewed",
 * appears for a visitor who has opened product pages before.
 */
const ROWS: readonly { key: string; title: string; href: string; ids: readonly string[] }[] = [
  {
    key: "laptops",
    title: "rowLaptops",
    href: "/products?cat=pc",
    ids: ["FZ-377", "FZ-374", "FZ-433", "FZ-385", "FZ-380"],
  },
  {
    key: "routers",
    title: "rowRouters",
    href: "/products?cat=net&sub=router",
    ids: ["FZ-107", "FZ-108", "FZ-110", "FZ-114", "FZ-106"],
  },
  {
    key: "cctv",
    title: "rowCctv",
    href: "/products?cat=cctv",
    ids: ["FZ-179", "FZ-182", "FZ-021", "FZ-004", "FZ-199"],
  },
];

export function ProductRows() {
  const t = useTranslations("HomeV2");
  const tSite = useTranslations("Site");
  const { data: catalog } = useCatalog();
  /** Product pages this visitor opened before (kept in the browser), newest first. */
  const recentIds = useSitePrefs((s) => s.recent);
  const recent = catalog ? recentIds.flatMap((id) => catalog.byId.get(id) ?? []).slice(0, 10) : [];

  return (
    <section id="rows" className={styles.rows}>
      <div className={`${styles.wrap} ${styles.rowsStack}`}>
        {ROWS.map((row) => {
          const products = catalog ? row.ids.flatMap((id) => catalog.byId.get(id) ?? []) : [];
          /** A row whose products all left the catalogue is dropped rather than shown as an empty heading. */
          if (catalog && products.length === 0) return null;
          return (
            <Reveal key={row.key} className={styles.row}>
              <div className={styles.rowHead}>
                <h2 className={styles.rowTitle}>{t(row.title)}</h2>
                <Link href={row.href} className={styles.moreLink}>
                  {t("viewAll")}
                  <ForwardArrow />
                </Link>
              </div>
              <Rail>
                {catalog
                  ? products.map((p) => <ProductCard key={p.id} product={p} catalog={catalog} />)
                  : row.ids.map((id) => <GhostCard key={id} />)}
              </Rail>
            </Reveal>
          );
        })}
        {catalog && recent.length > 0 ? (
          <div className={styles.row}>
            <div className={styles.rowHead}>
              <h2 className={styles.rowTitle}>{tSite("recentTitle")}</h2>
            </div>
            <Rail>
              {recent.map((p) => (
                <ProductCard key={p.id} product={p} catalog={catalog} />
              ))}
            </Rail>
          </div>
        ) : null}
      </div>
    </section>
  );
}
