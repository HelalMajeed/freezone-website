"use client";

import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLocale } from "@/i18n/hooks";
import { locales } from "@/navigation";

/**
 * Per-page SEO head manager (docs/STOREFRONT_DESIGN.md + WS4-B SEO layer).
 *
 * Implemented as a DOM upsert instead of react-helmet-async because the
 * helmet peer range stops at React 18 and this app runs React 19 — same
 * behavior, zero dependencies. Every managed tag carries `data-fz-seo` so
 * the build-time prerender (scripts/prerender.mjs) can emit identical tags
 * that this component then adopts/updates on hydration.
 */

export const SITE_NAME = "FreeZone";

export function publicSiteBaseUrl(): string {
  const env = (import.meta.env.VITE_PUBLIC_SITE_URL as string | undefined)?.trim();
  if (env) return env.replace(/\/$/, "");
  return window.location.origin;
}

const MANAGED_ATTR = "data-fz-seo";

function upsertMeta(kind: "name" | "property", key: string, content: string | null | undefined) {
  const selector = `meta[${kind}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!content) {
    if (el?.hasAttribute(MANAGED_ATTR)) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(kind, key);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  if (el.getAttribute("content") !== content) el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string | null | undefined, hreflang?: string) {
  const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!href) {
    if (el?.hasAttribute(MANAGED_ATTR)) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    if (hreflang) el.setAttribute("hreflang", hreflang);
    el.setAttribute(MANAGED_ATTR, "1");
    document.head.appendChild(el);
  }
  if (el.getAttribute("href") !== href) el.setAttribute("href", href);
}

export type SeoProps = {
  /** Page title without the site suffix — the component appends « | FreeZone ». */
  title: string;
  description?: string;
  /** Absolute or site-relative OG image. */
  image?: string | null;
  /** `product` on PDPs, `website` everywhere else. */
  ogType?: "website" | "product";
  /** Set on thin/duplicate pages (cart, checkout, account…). */
  noindex?: boolean;
  /** Override canonical path (defaults to the current pathname, query stripped). */
  canonicalPath?: string;
};

export function Seo({ title, description, image, ogType = "website", noindex = false, canonicalPath }: SeoProps) {
  const locale = useLocale();
  const { pathname } = useLocation();

  useEffect(() => {
    const base = publicSiteBaseUrl();
    const path = canonicalPath ?? pathname;
    const canonical = `${base}${path}`;
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const ogImage = image
      ? image.startsWith("http")
        ? image
        : `${base}${image.startsWith("/") ? image : `/${image}`}`
      : null;

    document.title = fullTitle;
    upsertMeta("name", "description", description);
    upsertMeta("name", "robots", noindex ? "noindex, nofollow" : null);

    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:type", ogType);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:image", ogImage);
    upsertMeta("property", "og:locale", locale === "ar" ? "ar_IQ" : "en_US");

    upsertMeta("name", "twitter:card", ogImage ? "summary_large_image" : "summary");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", ogImage);

    upsertLink("canonical", canonical);
    /** hreflang alternates — swap the locale segment of the current path. */
    const localePattern = /^\/(en|ar)(?=\/|$)/;
    for (const lc of locales) {
      const altPath = path.replace(localePattern, `/${lc}`);
      upsertLink("alternate", `${base}${altPath}`, lc);
    }
    upsertLink("alternate", `${base}${path.replace(localePattern, "/en")}`, "x-default");
  }, [title, description, image, ogType, noindex, canonicalPath, locale, pathname]);

  return null;
}
