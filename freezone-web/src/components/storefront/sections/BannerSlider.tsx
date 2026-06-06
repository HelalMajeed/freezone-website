"use client";

import { useEffect, useRef, useState } from "react";
import { Link } from "@/navigation";
import { useLocale } from "@/i18n/hooks";
import styles from "./BannerSlider.module.css";

/** FROZEN payload — see fz-ws1-backend/docs/API_CONTRACTS.md §(j) `banner_slider`. */
type BannerItem = {
  id: string;
  title: string;
  sub: string;
  badge: string;
  imageUrl: string;
  imageUrlMobile: string;
  href: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(locale: "en" | "ar", ar: unknown, en: unknown): string {
  return locale === "ar" ? str(ar) || str(en) : str(en) || str(ar);
}

function parseItems(payload: Record<string, unknown>, locale: "en" | "ar"): BannerItem[] {
  if (!Array.isArray(payload.items)) return [];
  const out: BannerItem[] = [];
  for (let i = 0; i < payload.items.length && out.length < 10; i++) {
    const raw = payload.items[i];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const it = raw as Record<string, unknown>;
    if (it.active === false) continue;
    const imageUrl = str(it.imageUrl).trim();
    const href = str(it.href).trim();
    if (!imageUrl || !href) continue;
    out.push({
      id: str(it.id) || `banner-${i}`,
      title: pick(locale, it.titleAr, it.titleEn),
      sub: pick(locale, it.subAr, it.subEn),
      badge: pick(locale, it.badgeAr, it.badgeEn),
      imageUrl,
      imageUrlMobile: str(it.imageUrlMobile).trim(),
      href,
    });
  }
  return out;
}

function clampAutoplay(v: unknown): number {
  const n = typeof v === "number" && Number.isFinite(v) ? v : 6000;
  if (n === 0) return 0;
  return Math.min(20_000, Math.max(2000, n));
}

export function BannerSlider({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const items = parseItems(payload, locale);
  const aspect = payload.aspect === "banner" ? "banner" : "wide";
  const autoplayMs = clampAutoplay(payload.autoplayMs);
  const [current, setCurrent] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = items.length;

  const goTo = (i: number) => {
    const track = trackRef.current;
    const slide = track?.children[i] as HTMLElement | undefined;
    if (!track || !slide) return;
    track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    setCurrent(i);
  };

  useEffect(() => {
    if (count <= 1 || autoplayMs === 0) return;
    const timer = setInterval(() => {
      setCurrent((c) => {
        const next = (c + 1) % count;
        const track = trackRef.current;
        const slide = track?.children[next] as HTMLElement | undefined;
        if (track && slide) track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
        return next;
      });
    }, autoplayMs);
    return () => clearInterval(timer);
  }, [count, autoplayMs]);

  if (count === 0) return null;
  const slideAspect = aspect === "banner" ? styles.slideBanner : styles.slideWide;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.viewport}>
        <div className={styles.track} ref={trackRef}>
          {items.map((item, i) => (
            <Link key={item.id} href={item.href} className={`${styles.slide} ${slideAspect}`}>
              <picture>
                {item.imageUrlMobile ? (
                  <source media="(max-width: 640px)" srcSet={item.imageUrlMobile} />
                ) : null}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className={styles.image}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                />
              </picture>
              {item.title || item.sub || item.badge ? <div className={styles.scrim} aria-hidden /> : null}
              <div className={styles.copy}>
                {item.badge ? <span className={styles.badge}>{item.badge}</span> : null}
                {item.title ? <h3 className={`fz-type-h3 ${styles.title}`}>{item.title}</h3> : null}
                {item.sub ? <p className={`fz-type-small ${styles.sub}`}>{item.sub}</p> : null}
              </div>
            </Link>
          ))}
        </div>
        {count > 1 ? (
          <div className={styles.dots}>
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.dot} ${i === current ? styles.dotActive : ""}`}
                onClick={() => goTo(i)}
                aria-label={
                  locale === "ar" ? `الانتقال إلى البانر ${i + 1}` : `Go to banner ${i + 1}`
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
