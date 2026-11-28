import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { whatsappLink } from "./contact";
import { ArrowUpIcon, WhatsAppIcon } from "./icons";
import styles from "./site.module.css";

/** Two round buttons in the corner: message the store on WhatsApp, and (when heading back up a long page) back to the top. */
export function FloatingActions() {
  const t = useTranslations("Site");
  const locale = useLocale();
  const { pathname } = useLocation();
  /** "Back to top" shows far down the page, and only while the visitor is heading up. */
  const [far, setFar] = useState(false);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 700) setFar(false);
      else if (y < last - 4) setFar(true);
      else if (y > last + 4) setFar(false);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** The order and contact pages already end in a WhatsApp button of their own. */
  const ownWhatsApp = pathname === `/${locale}/checkout` || pathname === `/${locale}/contact`;

  return (
    <div className={styles.floaters}>
      {far ? (
        <button
          type="button"
          className={`${styles.floater} ${styles.floaterLight}`}
          aria-label={t("backToTop")}
          onClick={() => {
            const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
          }}
        >
          <ArrowUpIcon />
        </button>
      ) : null}
      {ownWhatsApp ? null : (
        <a
          className={styles.floater}
          href={whatsappLink(t("waHello"))}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t("waFloat")}
          title={t("waFloat")}
        >
          <WhatsAppIcon size={26} />
        </a>
      )}
    </div>
  );
}
