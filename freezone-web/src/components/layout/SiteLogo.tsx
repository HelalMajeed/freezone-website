"use client";

import { useState } from "react";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { resolveSiteLogoUrl, SITE_BRAND_NAME, isSiteLogoPdfUrl } from "@/lib/siteConfig";
import { usePublicSite } from "@/components/providers/StorefrontProvider";
import styles from "./SiteLogo.module.css";

type SiteLogoVariant = "navbar" | "mobile" | "footer" | "auth";

export function SiteLogo({
  variant = "navbar",
  onNavigate,
}: {
  variant?: SiteLogoVariant;
  onNavigate?: () => void;
}) {
  const site = usePublicSite();
  const locale = useLocale();
  const tNav = useTranslations("Navigation");
  const envLogo = resolveSiteLogoUrl();
  const configured = (site.logoUrl?.trim() || envLogo || "").trim() || null;
  const [broken, setBroken] = useState(false);
  const showImage = Boolean(configured) && !broken;
  const headerLogoPx =
    typeof site.headerLogoHeightPx === "number" && site.headerLogoHeightPx > 0
      ? site.headerLogoHeightPx
      : 48;

  const linkClass =
    variant === "navbar"
      ? styles.linkNavbar
      : variant === "mobile"
        ? styles.linkMobile
        : variant === "footer"
          ? styles.linkFooter
          : styles.linkAuth;

  const imgClass =
    variant === "navbar"
      ? styles.imgNavbar
      : variant === "mobile"
        ? styles.imgMobile
        : variant === "footer"
          ? styles.imgFooter
          : styles.imgAuth;

  const objectClass =
    variant === "navbar"
      ? styles.objectNavbar
      : variant === "mobile"
        ? styles.objectMobile
        : variant === "footer"
          ? styles.objectFooter
          : styles.objectAuth;

  const isPdf = Boolean(configured && isSiteLogoPdfUrl(configured));

  const displayName = site.storeName?.trim() || SITE_BRAND_NAME;
  const headerTaglineText = site.tagline?.trim() || tNav("storeTagline");
  const wordmarkClass =
    variant === "navbar"
      ? styles.wordmarkNavbar
      : variant === "mobile"
        ? styles.wordmarkMobile
        : variant === "footer"
          ? styles.wordmarkFooter
          : styles.wordmarkAuth;

  const navTaglineClass =
    variant === "navbar" ? styles.navbarTagline : variant === "mobile" ? styles.mobileDrawerTagline : "";

  const nameAndTaglineColumn =
    variant === "navbar" || variant === "mobile" ? (
      <div
        className={styles.navbarTextColumn}
        dir={locale === "ar" ? "rtl" : "ltr"}
        lang={locale === "ar" ? "ar" : "en"}
      >
        <span className={wordmarkClass}>{displayName}</span>
        <span className={navTaglineClass}>{headerTaglineText}</span>
      </div>
    ) : null;

  const sizeStyle =
    variant === "navbar" || variant === "mobile"
      ? { height: headerLogoPx, maxHeight: headerLogoPx }
      : undefined;

  return (
    <Link href="/" className={linkClass} onClick={onNavigate}>
      {showImage && isPdf ? (
        <>
          <object
            data={configured!}
            type="application/pdf"
            aria-label={displayName}
            className={objectClass}
            style={sizeStyle}
          >
            <span className={variant === "footer" ? styles.fallbackMarkFooter : styles.fallbackMarkNavbar}>
              FZ
            </span>
          </object>
          {variant === "navbar" || variant === "mobile" ? (
            nameAndTaglineColumn
          ) : (
            <span className={wordmarkClass}>{displayName}</span>
          )}
        </>
      ) : showImage ? (
        <>
          <img
            src={configured!}
            alt={displayName}
            className={imgClass}
            style={sizeStyle}
            onError={() => setBroken(true)}
          />
          {variant === "navbar" || variant === "mobile" ? (
            nameAndTaglineColumn
          ) : (
            <span className={wordmarkClass}>{displayName}</span>
          )}
        </>
      ) : variant === "footer" ? (
        <span className={styles.fallbackFooter}>
          <span className={styles.fallbackMarkFooter}>FZ</span>
          {displayName}
        </span>
      ) : variant === "auth" ? (
        <span className={styles.fallbackAuth}>
          <span className={styles.fallbackMarkAuth}>FZ</span>
          {displayName}
        </span>
      ) : variant === "mobile" ? (
        <>
          <span className={styles.fallbackMarkMobile}>FZ</span>
          {nameAndTaglineColumn}
        </>
      ) : (
        <>
          <span className={styles.fallbackMarkNavbar}>FZ</span>
          {nameAndTaglineColumn}
        </>
      )}
    </Link>
  );
}
