"use client";

import { Link } from "@/navigation";
import styles from "./Footer.module.css";
import { MapPin, Phone, MessageCircle, Banknote, Smartphone, WalletCards, CreditCard } from "lucide-react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { usePublicSite, useStorefront } from "@/components/providers/StorefrontProvider";
import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";
import { SITE_BRAND_NAME } from "@/lib/siteConfig";

const footerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const footerCol = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: EASE_OUT },
  },
};

const footerColStatic = { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } };

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("Footer");
  /** Phase-2 content keys (lowercase namespace, conflict-free additions). */
  const tF = useTranslations("footer");
  const site = usePublicSite();
  const locale = useLocale();
  /** Top-level categories, same source as the home tiles/mega-nav (bootstrap catalog). */
  const { catalog } = useStorefront();
  const footerCategories = catalog.categories.filter((c) => !c.parent).slice(0, 6);
  const reduceMotion = useReducedMotion();

  const colV = reduceMotion ? footerColStatic : footerCol;
  const containerV = reduceMotion ? { hidden: {}, show: {} } : footerContainer;

  const gridViewport = { once: true, amount: 0.18, margin: "0px 0px -56px 0px" as const };

  const displayName = site.storeName?.trim() || SITE_BRAND_NAME;
  const brandLabel = displayName === "Store" ? "FreeZone" : displayName;
  const phoneDisplay = site.phone?.trim() || "0774 222 2377";
  const phoneHref = `tel:${phoneDisplay.replace(/\s/g, "")}`;
  const whatsappHref = `https://wa.me/${(site.whatsapp || site.phone || "9647742222377").replace(/\D/g, "")}`;

  return (
    <footer className={styles.wrapper}>
      <motion.div
        className={styles.inner}
        variants={containerV}
        initial="hidden"
        whileInView="show"
        viewport={gridViewport}
      >
        <div className={styles.grid}>
          {/* Brand */}
          <motion.div className={styles.brandCol} variants={colV}>
            <div className={styles.brandRow}>
              <span className={styles.brandLogoWrap} aria-hidden>
                <img src={FREEZONE_Z_LOGO} alt="" className={styles.brandLogo} width={36} height={36} />
              </span>
              <span className={styles.brandName}>{brandLabel}</span>
            </div>
            <div className={styles.tagline}>{site.tagline?.trim() || t("tagline")}</div>
            <p className={styles.brandDesc}>{site.metaDescription?.trim() || t("brandDesc")}</p>
            <div className={styles.socials}>
              {site.social.map((s) => {
                const label = s.platform === "tiktok" ? "TikTok" : s.platform.charAt(0).toUpperCase() + s.platform.slice(1);
                const child =
                  s.platform === "facebook" ? (
                    <FacebookIcon />
                  ) : s.platform === "instagram" ? (
                    <InstagramIcon />
                  ) : s.platform === "tiktok" ? (
                    <TikTokIcon />
                  ) : (
                    <span style={{ fontSize: "0.7rem", fontWeight: 800 }}>{label[0]}</span>
                  );
                return (
                  <a
                    key={`${s.platform}-${s.sortOrder}`}
                    href={s.url}
                    className={styles.socialIcon}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                  >
                    {child}
                  </a>
                );
              })}
            </div>
          </motion.div>

          {/* Categories */}
          {footerCategories.length > 0 ? (
            <motion.div variants={colV}>
              <h4 className={styles.colTitle}>{tF("categoriesTitle")}</h4>
              <div className={styles.linksList}>
                {footerCategories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/category/${encodeURIComponent(c.id)}`}
                    className={styles.linkItem}
                  >
                    {locale === "ar" ? c.nameAr || c.name : c.name}
                  </Link>
                ))}
              </div>
            </motion.div>
          ) : null}

          {/* Quick Links */}
          <motion.div variants={colV}>
            <h4 className={styles.colTitle}>{t("colQuickLinks")}</h4>
            <div className={styles.linksList}>
              <Link href="/about" className={styles.linkItem}>
                {t("aboutUs")}
              </Link>
              <Link href="/products" className={styles.linkItem}>
                {t("allProducts")}
              </Link>
              <Link href="/products?featured=true" className={styles.linkItem}>
                {locale === "ar" ? "الأكثر مبيعاً" : "Best Sellers"}
              </Link>
              <Link href="/products?isNew=true" className={styles.linkItem}>
                {locale === "ar" ? "وصل حديثاً" : "New Arrivals"}
              </Link>
              <Link href="/pc-builder" className={styles.linkItem}>
                {t("pcBuilder")}
              </Link>
              <Link href="/track-order" className={styles.linkItem}>
                {t("trackOrder")}
              </Link>
              <Link href="/contact" className={styles.linkItem}>
                {t("contactUs")}
              </Link>
            </div>
          </motion.div>

          {/* Information */}
          <motion.div variants={colV}>
            <h4 className={styles.colTitle}>{t("colInfo")}</h4>
            <div className={styles.linksList}>
              <Link href="/shipping" className={styles.linkItem}>
                {t("shipping")}
              </Link>
              <Link href="/warranty" className={styles.linkItem}>
                {tF("warranty")}
              </Link>
              <Link href="/returns" className={styles.linkItem}>
                {tF("returns")}
              </Link>
              <Link href="/privacy" className={styles.linkItem}>
                {t("privacy")}
              </Link>
              <Link href="/terms" className={styles.linkItem}>
                {t("terms")}
              </Link>
              <Link href="/faq" className={styles.linkItem}>
                {t("faq")}
              </Link>
            </div>
          </motion.div>

          {/* Contact & Newsletter */}
          <motion.div variants={colV}>
            <h4 className={styles.colTitle}>{t("colContact")}</h4>
            <div className={styles.contactItem}>
              <MapPin className={styles.contactIcon} size={16} aria-hidden />
              <span>{site.address?.trim() || t("address")}</span>
            </div>
            <div className={styles.contactItem}>
              <Phone className={styles.contactIcon} size={16} aria-hidden />
              <a href={phoneHref}>{phoneDisplay}</a>
            </div>
            <div className={styles.contactItem}>
              <MessageCircle className={styles.contactIcon} size={16} aria-hidden />
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </div>

            {/* Honest WhatsApp subscribe CTA — replaces the old fake newsletter form
                (it showed a success toast and discarded the input). */}
            <div className={styles.newsletter}>
              <p className={styles.newsTitle}>{tF("whatsappTitle")}</p>
              <p className={styles.newsLabel}>{tF("whatsappBody")}</p>
              <a
                href={`https://wa.me/${(site.whatsapp || site.phone || "9647742222377").replace(/\D/g, "")}?text=${encodeURIComponent(tF("whatsappPrefill"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.waCta}
              >
                <MessageCircle size={15} aria-hidden />
                {tF("whatsappCta")}
              </a>
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className={styles.bottomStrip}>
        {/* Payment methods — neutral badges; e-payments stay honest ("coming soon",
            arranged on WhatsApp) consistent with checkout. No hotlinked brand images. */}
        <div className={`${styles.inner} ${styles.paymentsRow}`}>
          <span className={styles.paymentsTitle}>{tF("paymentsTitle")}</span>
          <ul className={styles.paymentsList} aria-label={tF("paymentsTitle")}>
            <li className={styles.paymentBadge}>
              <Banknote size={14} aria-hidden />
              {tF("payCod")}
            </li>
            <li className={styles.paymentBadge}>
              <Smartphone size={14} aria-hidden />
              {tF("payZaincash")}
            </li>
            <li className={styles.paymentBadge}>
              <WalletCards size={14} aria-hidden />
              {tF("payQicard")}
            </li>
            <li className={styles.paymentBadge}>
              <CreditCard size={14} aria-hidden />
              {tF("payVisa")}
            </li>
            <li className={styles.paymentBadge}>
              <CreditCard size={14} aria-hidden />
              {tF("payMaster")}
            </li>
          </ul>
          <span className={styles.paymentsHint}>{tF("paymentsComingSoon")}</span>
        </div>
        <div className={`${styles.inner} ${styles.bottomInner}`}>
          <p className={styles.copyright}>
            &copy; {new Date().getFullYear()} FreeZone. {t("copyright")}
          </p>
          <p className={styles.madeIn}>{t("madeIn")}</p>
        </div>
      </div>
    </footer>
  );
}
