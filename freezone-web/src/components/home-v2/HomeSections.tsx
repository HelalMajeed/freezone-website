import { useMemo } from "react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { useStorefront } from "@/components/providers/StorefrontProvider";
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

/** Category page when the store has that category, the full catalogue otherwise. */
export function useCategoryHref(): (slugs: readonly string[]) => string {
  const { catalog } = useStorefront();
  const known = useMemo(() => new Set(catalog.categories.map((c) => c.id)), [catalog.categories]);
  return (slugs) => {
    const hit = slugs.find((s) => known.has(s));
    return hit ? `/category/${encodeURIComponent(hit)}` : "/products";
  };
}

/** Logos shown under the hero, in this order; `em` is each logo's height against the row. */
const BRANDS: readonly { file: string; name: string; em: number }[] = [
  { file: "hikvision.webp", name: "Hikvision", em: 1.15 },
  { file: "ezviz.webp", name: "EZVIZ", em: 2.0 },
  { file: "sunell.webp", name: "Sunell", em: 2.5 },
  { file: "grandstream.webp", name: "Grandstream", em: 2.2 },
  { file: "lenovo.svg", name: "Lenovo", em: 1.6 },
  { file: "asus.svg", name: "ASUS", em: 1.25 },
  { file: "msi.svg", name: "MSI", em: 2.5 },
  { file: "hp.svg", name: "HP", em: 2.25 },
  { file: "epson.svg", name: "Epson", em: 1.1 },
  { file: "playstation.svg", name: "PlayStation", em: 1.9 },
];

export function BrandStrip() {
  const t = useTranslations("HomeV2");
  return (
    <div className={`${styles.wrap} ${styles.brands}`}>
      <ul className={styles.brandRow} aria-label={t("brandsLabel")}>
        {BRANDS.map((b) => (
          <li key={b.name} className={styles.brandItem}>
            <img
              src={`/home-v2/brands/${b.file}`}
              alt={b.name}
              className={styles.brandLogo}
              style={{ height: `${b.em}em` }}
              loading="lazy"
              decoding="async"
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

const CARDS: readonly { key: SectionSceneKey; title: string; slugs: readonly string[]; wide?: boolean }[] = [
  { key: "cctv", title: "secCctv", slugs: ["cctv"], wide: true },
  { key: "pc", title: "secPc", slugs: ["computers", "laptops"] },
  { key: "gaming", title: "secGaming", slugs: ["gaming"] },
  { key: "net", title: "secNet", slugs: ["networking"] },
  { key: "smart", title: "secSmart", slugs: ["smart-home"] },
  { key: "power", title: "secPower", slugs: ["power-solutions"], wide: true },
];

/** "Shop by section": six cards, each with a looping product scene (CSS only). */
export function SectionCards() {
  const t = useTranslations("HomeV2");
  const hrefFor = useCategoryHref();
  return (
    <div className={`${styles.wrap} ${styles.stack}`}>
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
            href={hrefFor(c.slugs)}
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

const PROMOS: readonly { file: string; alt: string; slugs: readonly string[] }[] = [
  { file: "networking.webp", alt: "promoNetworking", slugs: ["networking"] },
  { file: "accessories.webp", alt: "promoAccessories", slugs: ["accessories"] },
  { file: "alarm.webp", alt: "promoAlarm", slugs: ["alarm-systems", "security"] },
  { file: "power.webp", alt: "promoPower", slugs: ["power-solutions"] },
];

export function PromoGrid() {
  const t = useTranslations("HomeV2");
  const hrefFor = useCategoryHref();
  return (
    <section className={styles.promos} aria-label={t("promosLabel")}>
      <div className={styles.wrap}>
        <div className={styles.promoGrid}>
          {PROMOS.map((p) => (
            <Link key={p.file} href={hrefFor(p.slugs)} className={styles.promo}>
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
    <section className={styles.projects}>
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
          <Link href="/contact" className={styles.projectsCta}>
            {t("projectsCta")}
            <ForwardArrow />
          </Link>
        </div>
        <div className={styles.projectsSpacer} />
      </div>
    </section>
  );
}
