"use client";

import { Link } from "@/navigation";
import styles from "./Footer.module.css";
import { MapPin, Phone, MessageCircle, Send } from "lucide-react";
import { useTranslations } from "@/i18n/hooks";
import { SiteLogo } from "./SiteLogo";
import { motion, useReducedMotion } from "framer-motion";
import { EASE_OUT } from "@/lib/motion";
import { usePublicSite } from "@/components/providers/StorefrontProvider";

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
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

export function Footer() {
  const t = useTranslations("Footer");
  const site = usePublicSite();
  const reduceMotion = useReducedMotion();

  const colV = reduceMotion ? footerColStatic : footerCol;
  const containerV = reduceMotion ? { hidden: {}, show: {} } : footerContainer;

  const gridViewport = { once: true, amount: 0.18, margin: "0px 0px -56px 0px" as const };

  return (
    <footer className={styles.wrapper}>
      <motion.div
        className={`container ${styles.grid}`}
        variants={containerV}
        initial="hidden"
        whileInView="show"
        viewport={gridViewport}
      >
        {/* Brand */}
        <motion.div className={styles.brandCol} variants={colV}>
          <SiteLogo variant="footer" />
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
                <a key={`${s.platform}-${s.sortOrder}`} href={s.url} className={styles.socialIcon} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  {child}
                </a>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div variants={colV}>
          <h4 className={styles.colTitle}>{t("colQuickLinks")}</h4>
          <div className={styles.linksList}>
            <Link href="/"          className={styles.linkItem}>{t("aboutUs") /* We don't have a direct home in Footer translation but usually there's Home */}</Link>
            <Link href="/products"  className={styles.linkItem}>{t("allProducts")}</Link>
            <Link href="/pc-builder"className={styles.linkItem}>{t("pcBuilder")}</Link>
            <Link href="/about"     className={styles.linkItem}>{t("aboutUs")}</Link>
            <Link href="/contact"   className={styles.linkItem}>{t("contactUs")}</Link>
          </div>
        </motion.div>

        {/* Information */}
        <motion.div variants={colV}>
          <h4 className={styles.colTitle}>{t("colInfo")}</h4>
          <div className={styles.linksList}>
            <Link href="#" className={styles.linkItem}>{t("shipping")}</Link>
            <Link href="#" className={styles.linkItem}>{t("warranty")}</Link>
            <Link href="#" className={styles.linkItem}>{t("privacy")}</Link>
            <Link href="#" className={styles.linkItem}>{t("terms")}</Link>
            <Link href="#" className={styles.linkItem}>{t("faq")}</Link>
          </div>
        </motion.div>

        {/* Contact & Newsletter */}
        <motion.div variants={colV}>
          <h4 className={styles.colTitle}>{t("colContact")}</h4>
          <div className={styles.contactItem}>
            <MapPin className={styles.contactIcon} size={16} />
            <span>{site.address || t("address")}</span>
          </div>
          <div className={styles.contactItem}>
            <Phone className={styles.contactIcon} size={16} />
            <a
              href={`tel:${(site.phone || "+964 000 000 0000").replace(/\s/g, "")}`}
              style={{ color: "inherit" }}
            >
              {site.phone || "+964 000 000 0000"}
            </a>
          </div>
          <div className={styles.contactItem}>
            <MessageCircle className={styles.contactIcon} size={16} />
            <a
              href={`https://wa.me/${(site.whatsapp || site.phone || "+9640000000000").replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "inherit" }}
            >
              WhatsApp
            </a>
          </div>

          <div className={styles.newsletter}>
            <h5 className={styles.newsTitle}>{t("newsTitle")}</h5>
            <p className={styles.newsDesc}>{t("newsDesc")}</p>
            <form className={styles.inputGroup} onSubmit={e => { e.preventDefault(); alert(t("subscribed")); }}>
              <input type="tel" inputMode="tel" autoComplete="tel" placeholder={t("phonePlaceholder")} className={styles.input} required />
              <button type="submit" className={styles.submitBtn}><Send size={15} /></button>
            </form>
          </div>
        </motion.div>
      </motion.div>

      {/* Bottom bar: static DOM so it never stays opacity:0 if in-view detection misses at page end */}
      <div className={styles.bottomStrip}>
        <div className={`container ${styles.bottomInner}`}>
          <div className={styles.copyright}>
            &copy; {new Date().getFullYear()} {t("copyright")}
          </div>
          <div className={styles.payments}>
            <span className={styles.payBadge}>CASH ON DELIVERY</span>
            <span className={styles.payBadge}>ZAIN CASH</span>
            <span className={styles.payBadge}>VISA</span>
            <span className={styles.payBadge}>MASTER</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
