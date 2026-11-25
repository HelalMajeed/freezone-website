import { HeroFilms } from "./HeroFilms";
import { BrandStrip, PromoGrid, ProjectsBanner, SectionCards } from "./HomeSections";
import { ProductRows } from "./ProductRows";
import "./generated/homeMotion.css";
import styles from "./HomeV2.module.css";

/**
 * Home page v2 (design canvas "Home · Light"): layered hero banners, "shop by
 * section" cards, brand strip, three product rows, promo pictures and the projects
 * banner. Header and footer come from the storefront shell (src/site/SiteLayout).
 */
export default function HomeV2() {
  return (
    <div className={styles.root}>
      <HeroFilms />
      <section className={styles.sections}>
        <SectionCards />
      </section>
      <BrandStrip />
      <ProductRows />
      <PromoGrid />
      <ProjectsBanner />
    </div>
  );
}
