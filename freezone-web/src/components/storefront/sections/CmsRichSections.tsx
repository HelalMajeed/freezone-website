"use client";

import type { CSSProperties } from "react";
import { Link } from "@/navigation";
import { useLocale } from "@/i18n/hooks";
import styles from "./CmsRichSections.module.css";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pick(locale: "en" | "ar", ar: unknown, en: unknown): string {
  return locale === "ar" ? str(ar) || str(en) : str(en) || str(ar);
}

/* ── `testimonials` ─────────────────────────────── */
export function TestimonialsSection({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const items = Array.isArray(payload.items) ? payload.items : [];

  const cards = items
    .map((raw, i) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
      const it = raw as Record<string, unknown>;
      const text = pick(locale, it.textAr, it.textEn);
      const name = pick(locale, it.nameAr, it.nameEn);
      if (!text) return null;
      return { id: `t-${i}`, text, name };
    })
    .filter((x): x is { id: string; text: string; name: string } => x != null);

  if (cards.length === 0) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.testimonialsGrid}>
        {cards.map((card) => (
          <figure key={card.id} className={styles.testimonialCard}>
            <blockquote className={`fz-type-small ${styles.testimonialQuote}`}>
              {card.text}
            </blockquote>
            {card.name ? (
              <figcaption className={styles.testimonialName}>{card.name}</figcaption>
            ) : null}
          </figure>
        ))}
      </div>
    </section>
  );
}

/* ── `cta` ──────────────────────────────────────── */
export function CtaSection({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const title = pick(locale, payload.titleAr, payload.titleEn);
  const subtitle = pick(locale, payload.subtitleAr, payload.subtitleEn);
  const btn = pick(locale, payload.buttonAr, payload.buttonEn);
  const href = str(payload.href).trim() || "/products";
  /** CMS-authored background color (data value, not a style decision) */
  const bg = str(payload.bg).trim();
  const panelStyle: CSSProperties | undefined = bg ? { background: bg } : undefined;

  return (
    <section className={`container ${styles.section}`}>
      <div className={styles.ctaPanel} style={panelStyle}>
        {title ? <h2 className={`fz-type-h2 ${styles.ctaTitle}`}>{title}</h2> : null}
        {subtitle ? <p className={`fz-type-body ${styles.ctaSubtitle}`}>{subtitle}</p> : null}
        <Link href={href} className={`btn-red ${styles.ctaButton}`} prefetch>
          {btn || (locale === "ar" ? "تسوق الآن" : "Shop now")}
        </Link>
      </div>
    </section>
  );
}

/* ── `split_richtext` ───────────────────────────── */
export function SplitRichtext({ payload }: { payload: Record<string, unknown> }) {
  const locale = useLocale() as "en" | "ar";
  const title = pick(locale, payload.titleAr, payload.titleEn);
  const body = pick(locale, payload.bodyAr, payload.bodyEn);
  const imageUrl = str(payload.imageUrl).trim();
  const reverse = payload.imageSide === "left";

  if (!title && !body && !imageUrl) return null;

  return (
    <section className={`container ${styles.section}`}>
      <div className={`${styles.split} ${reverse ? styles.splitReverse : ""}`}>
        <div className={styles.splitText}>
          {title ? <h2 className="fz-type-h2">{title}</h2> : null}
          {body ? <p className={`fz-type-body ${styles.splitBody}`}>{body}</p> : null}
        </div>
        {imageUrl ? (
          <img src={imageUrl} alt="" className={styles.splitImage} loading="lazy" decoding="async" />
        ) : null}
      </div>
    </section>
  );
}
