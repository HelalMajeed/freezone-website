import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { SECTION_SCENES, type SectionSceneKey } from "./generated/sectionScenes";
import styles from "./HomeV2.module.css";

/** Arrow drawn pointing left (forward in Arabic); mirrored for English in the CSS. */
export function ForwardArrow({ size = 18 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={styles.arrowIcon}
    >
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </svg>
  );
}

/**
 * Logos shown under the hero, in this order; `em` is each logo's height against
 * the row. `listed` brands have products in the catalogue and link to them; the
 * others open the contact page with a question about that brand ready to send.
 */
const BRANDS: readonly { file: string; name: string; em: number; listed?: boolean }[] = [
  { file: "hikvision.webp", name: "Hikvision", em: 1.15, listed: true },
  { file: "ezviz.webp", name: "EZVIZ", em: 2.0, listed: true },
  { file: "sunell.webp", name: "Sunell", em: 2.5, listed: true },
  { file: "grandstream.webp", name: "Grandstream", em: 2.2 },
  { file: "lenovo.svg", name: "Lenovo", em: 1.6, listed: true },
  { file: "asus.svg", name: "ASUS", em: 1.25, listed: true },
  { file: "msi.svg", name: "MSI", em: 2.5, listed: true },
  { file: "hp.svg", name: "HP", em: 2.25, listed: true },
  { file: "epson.svg", name: "Epson", em: 1.1 },
  { file: "playstation.svg", name: "PlayStation", em: 1.9 },
];

export function BrandStrip() {
  const t = useTranslations("HomeV2");
  return (
    <div id="brands" className={`${styles.wrap} ${styles.brands}`}>
      <ul className={styles.brandRow} aria-label={t("brandsLabel")}>
        {BRANDS.map((b) => {
          const logo = (
            <img
              src={`/home-v2/brands/${b.file}`}
              alt={b.name}
              className={styles.brandLogo}
              style={{ height: `${b.em}em` }}
              loading="lazy"
              decoding="async"
            />
          );
          return (
            <li key={b.name} className={styles.brandItem}>
              <Link
                href={b.listed ? `/products?brand=${encodeURIComponent(b.name)}` : `/contact?ask=${encodeURIComponent(b.name)}`}
                className={styles.brandLink}
                aria-label={t(b.listed ? "brandView" : "brandAsk", { name: b.name })}
                title={t(b.listed ? "brandView" : "brandAsk", { name: b.name })}
              >
                {logo}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Each card opens the product list already filtered (section ids: src/site/data).
 * The catalogue has no power/solar products yet, so that card opens the whole list.
 */
const CARDS: readonly { key: SectionSceneKey; title: string; href: string; wide?: boolean }[] = [
  { key: "cctv", title: "secCctv", href: "/products?cat=cctv", wide: true },
  { key: "pc", title: "secPc", href: "/products?cat=pc" },
  { key: "gaming", title: "secGaming", href: "/products?cat=pc&sub=lap-gaming" },
  { key: "net", title: "secNet", href: "/products?cat=net" },
  { key: "smart", title: "secSmart", href: "/products?cat=smart" },
  { key: "power", title: "secPower", href: "/products", wide: true },
];

/** "Shop by section": six cards, each with a looping product scene (CSS only). */
export function SectionCards() {
  const t = useTranslations("HomeV2");
  return (
    <div id="categories" className={`${styles.wrap} ${styles.stack}`}>
      <div className={styles.headRow}>
        <h2 className={styles.h2}>{t("shopBySection")}</h2>
        <Link href="/products" className={styles.moreLink}>
          {t("allSections")}
          <ForwardArrow />
        </Link>
      </div>
      <div className={styles.cardGrid}>
        {CARDS.map((c) => (
          <Link
            key={c.key}
            href={c.href}
            className={`${styles.card} ${c.wide ? styles.cardWide : ""} fzh-card fzh-c-${c.key}`}
          >
            <span className={styles.cardHead}>
              <span>
                <span className={`${styles.cardTitle} fzh-title`}>{t(c.title)}</span>
                <span className={`${styles.cardMark} fzh-mark`} aria-hidden="true" />
              </span>
              <span className={`${styles.cardArrow} fzh-arrow`}>
                <ForwardArrow size={16} />
              </span>
            </span>
            {/* Decoration only — static, generated markup (generated/sectionScenes.ts), never user data. */}
            <span
              className={styles.cardScene}
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: SECTION_SCENES[c.key] }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Same rule: pictures without matching products in the catalogue open the whole list. */
const PROMOS: readonly { file: string; alt: string; href: string }[] = [
  { file: "networking.webp", alt: "promoNetworking", href: "/products?cat=net" },
  { file: "accessories.webp", alt: "promoAccessories", href: "/products" },
  { file: "alarm.webp", alt: "promoAlarm", href: "/products?cat=fire" },
  { file: "power.webp", alt: "promoPower", href: "/products" },
];

export function PromoGrid() {
  const t = useTranslations("HomeV2");
  return (
    <section id="offers" className={styles.promos} aria-label={t("promosLabel")}>
      <div className={styles.wrap}>
        <div className={styles.promoGrid}>
          {PROMOS.map((p) => (
            <Link key={p.file} href={p.href} className={styles.promo}>
              <img
                src={`/home-v2/promos/${p.file}`}
                alt={t(p.alt)}
                width={1672}
                height={941}
                loading="lazy"
                decoding="async"
                className={styles.promoImg}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ProjectsBanner() {
  const t = useTranslations("HomeV2");
  return (
    <section id="solutions" className={styles.projects}>
      <img
        src="/home-v2/projects/sunell-pole.webp"
        alt={t("projectsImageAlt")}
        width={1843}
        height={576}
        loading="lazy"
        decoding="async"
        className={styles.projectsImg}
      />
      <span className={styles.projectsScrim} aria-hidden="true" />
      <div className={`${styles.wrap} ${styles.projectsInner}`}>
        <div className={styles.projectsText}>
          <div className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            <span>{t("projectsEyebrow")}</span>
          </div>
          <h2 className={styles.projectsTitle}>{t("projectsTitle")}</h2>
          <p className={styles.projectsLead}>{t("projectsText")}</p>
          {/* The quote form on the contact page gathers the project details and sends them on WhatsApp. */}
          <Link href="/contact?topic=quote" className={styles.projectsCta}>
            {t("projectsCta")}
            <ForwardArrow />
          </Link>
        </div>
        <div className={styles.projectsSpacer} />
      </div>
    </section>
  );
}
