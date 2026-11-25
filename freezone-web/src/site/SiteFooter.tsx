import { Link as RouterLink } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_DISPLAY, whatsappLink } from "./contact";
import { InstagramIcon, PhoneIcon, PinIcon } from "./icons";
import styles from "./site.module.css";

const SHOP: readonly { key: string; cat: string }[] = [
  { key: "footCctv", cat: "cctv" },
  { key: "footPc", cat: "pc" },
  { key: "footNet", cat: "net" },
  { key: "footSmart", cat: "smart" },
];

export function SiteFooter() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`${styles.wrap} ${styles.footGrid}`}>
        <div className={styles.footAbout}>
          <img src="/site/logo-white.svg" alt="FreeZone" width={379} height={107} loading="lazy" className={styles.footLogo} />
          <span className={styles.footLine}>
            <PinIcon />
            <span>{t("address")}</span>
          </span>
          <a className={styles.footLine} href={whatsappLink(t("waHello"))} target="_blank" rel="noopener noreferrer">
            <PhoneIcon />
            <span>
              {t("whatsapp")} <bdi dir="ltr">{WHATSAPP_DISPLAY}</bdi>
            </span>
          </a>
        </div>
        <div className={styles.footCol}>
          <span className={styles.footTitle}>{t("footShop")}</span>
          {SHOP.map((s) => (
            <RouterLink key={s.key} to={`/${locale}/products?cat=${s.cat}`}>
              {t(s.key)}
            </RouterLink>
          ))}
        </div>
        <div className={styles.footCol}>
          <span className={styles.footTitle}>FreeZone</span>
          <RouterLink to={{ pathname: `/${locale}`, hash: "#solutions" }}>{t("navProjects")}</RouterLink>
          <RouterLink to={{ pathname: `/${locale}`, hash: "#brands" }}>{t("navBrands")}</RouterLink>
          <a href={whatsappLink(t("waHello"))} target="_blank" rel="noopener noreferrer">
            {t("footContact")}
          </a>
        </div>
      </div>
      <div className={styles.wrap}>
        <div className={styles.footBar}>
          <div className={styles.footRights}>
            <span dir="ltr">© {year} FreeZone</span>
            <span>{t("rights")}</span>
          </div>
          <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className={styles.footSocial}>
            <InstagramIcon />
            <span dir="ltr">{INSTAGRAM_HANDLE}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
