"use client";

import { useState, useEffect, type CSSProperties, type ReactNode } from "react";
import styles from "./HeroSlider.module.css";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Link } from "@/navigation";
import { ResponsiveImage } from "./ResponsiveImage";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { useLocale } from "@/i18n/hooks";
import type { PublicHeroSlide } from "@/lib/layout-cms";
import type { HeroFreeformLayer } from "@/lib/cms-types";
import { sanitizeHeroSlides } from "@/lib/hero-content";

function isAbsoluteOrProtocolHref(href: string): boolean {
  const t = href.trim();
  return /^https?:\/\//i.test(t) || t.startsWith("//") || t.startsWith("mailto:") || t.startsWith("tel:");
}

function CtaLink({
  href,
  className,
  prefetch,
  children,
}: {
  href: string;
  className?: string;
  prefetch?: boolean;
  children: ReactNode;
}) {
  if (isAbsoluteOrProtocolHref(href)) {
    return (
      <a className={className} href={href.trim()} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className} prefetch={prefetch}>
      {children}
    </Link>
  );
}

type PreviewHero = {
  slides: PublicHeroSlide[];
  autoplayMs: number;
  scrimOpacity: number;
  navArrowColor: string;
  navBoxBackground: string;
};

/** No external fallback image — broken/missing slide art degrades to a token gradient. */
function HeroSlideBackground({ src, priority }: { src: string; priority: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setFailed(false);
  }, [src]);
  if (!src?.trim() || failed) {
    return <div className={styles.bgImageFallback} aria-hidden />;
  }
  return (
    <ResponsiveImage
      src={src}
      alt=""
      className={styles.bgImage}
      sizes="100vw"
      priority={priority}
      onError={() => setFailed(true)}
    />
  );
}

function FreeformLayers({
  layers,
  locale,
}: {
  layers: HeroFreeformLayer[];
  locale: "en" | "ar";
}) {
  const en = locale === "en";
  return (
    <div className={styles.freeformRoot}>
      {layers.map((layer) => {
        if (layer.type === "text") {
          const text = en ? layer.textEn : layer.textAr;
          return (
            <div
              key={layer.id}
              className={styles.freeformText}
              style={{
                left: `${layer.x}%`,
                top: `${layer.y}%`,
                width: `${layer.widthPct}%`,
                fontSize: layer.fontSizePx,
                color: layer.color,
                fontWeight: layer.fontWeight,
                textAlign: layer.textAlign,
                zIndex: layer.zIndex,
              }}
            >
              {text}
            </div>
          );
        }
        const label = en ? layer.labelEn : layer.labelAr;
        const btnClass =
          layer.variant === "primary" ? styles.primaryBtn : styles.secondaryBtn;
        return (
          <div
            key={layer.id}
            className={styles.freeformBtnWrap}
            style={{
              left: `${layer.x}%`,
              top: `${layer.y}%`,
              zIndex: layer.zIndex,
            }}
          >
            <CtaLink href={layer.href} className={btnClass}>
              {label}
            </CtaLink>
          </div>
        );
      })}
    </div>
  );
}

export function HeroSlider({ previewHero }: { previewHero?: PreviewHero }) {
  const { home } = useStorefront();
  const locale = useLocale() as "en" | "ar";
  const reduceMotion = useReducedMotion();

  const heroBlock = previewHero ?? home.hero;
  const scrimA =
    typeof heroBlock.scrimOpacity === "number" && Number.isFinite(heroBlock.scrimOpacity)
      ? Math.min(1, Math.max(0, heroBlock.scrimOpacity))
      : 0.25;
  // Public storefront: drop placeholder/empty slides and fall back to premium
  // FreeZone content when the CMS payload is weak. The admin live preview
  // (previewHero) is shown exactly as entered so editors can see their data.
  const activeSlides = heroBlock.slides.filter((s) => s.active);
  const slidesIn = previewHero
    ? activeSlides.length > 0
      ? activeSlides
      : heroBlock.slides
    : sanitizeHeroSlides(heroBlock.slides, locale);

  const [current, setCurrent] = useState(0);

  const next = () => setCurrent((c) => (c + 1) % slidesIn.length);
  const prev = () => setCurrent((c) => (c === 0 ? slidesIn.length - 1 : c - 1));

  useEffect(() => {
    if (slidesIn.length <= 1) return;
    const ms = Math.max(2500, heroBlock.autoplayMs || 7000);
    const timer = setInterval(
      () => setCurrent((c) => (c + 1) % slidesIn.length),
      ms,
    );
    return () => clearInterval(timer);
  }, [slidesIn.length, heroBlock.autoplayMs]);

  useEffect(() => {
    setCurrent(0);
  }, [slidesIn.length]);

  if (slidesIn.length === 0) return null;
  const slide = slidesIn[current];

  const isFreeform =
    slide.layoutMode === "freeform" && slide.freeformLayers && slide.freeformLayers.length > 0;

  const navChromeStyle = {
    "--hero-nav-arrow": heroBlock.navArrowColor,
    "--hero-nav-box": heroBlock.navBoxBackground,
  } as CSSProperties;

  return (
    <div className={styles.wrapper} style={navChromeStyle}>
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -28 }}
          transition={{ duration: reduceMotion ? 0.25 : 0.52, ease: [0.22, 1, 0.36, 1] }}
          className={styles.slide}
        >
          <HeroSlideBackground src={slide.image} priority={current === 0} />
          <div
            className={styles.overlay}
            style={{ background: `rgba(0,0,0,${scrimA})` }}
            aria-hidden
          />

          {isFreeform ? (
            <div className={`container ${styles.content}`}>
              <FreeformLayers layers={slide.freeformLayers!} locale={locale} />
            </div>
          ) : (
            <div className={`container ${styles.content}`}>
              <motion.div
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className={styles.badge}
              >
                <span className={styles.badgeDot} />
                {slide.badge}
              </motion.div>

              <motion.h1
                initial={{ y: 32, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.55 }}
                className={styles.title}
              >
                {slide.titleLine1}
                <span className={styles.titleAccent}>{slide.titleLine2}</span>
              </motion.h1>

              <motion.p
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.42, duration: 0.5 }}
                className={styles.desc}
              >
                {slide.desc}
              </motion.p>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.52, duration: 0.5 }}
                className={styles.actions}
              >
                <CtaLink href={slide.primaryHref} className={styles.primaryBtn} prefetch>
                  {slide.primaryLabel}
                  <ArrowRight size={16} style={locale === "ar" ? { transform: "scaleX(-1)" } : undefined} />
                </CtaLink>
                <CtaLink href={slide.secondaryHref} className={styles.secondaryBtn} prefetch>
                  {slide.secondaryLabel}
                </CtaLink>
              </motion.div>

              {slide.stats && slide.stats.length > 0 && (
                <motion.div
                  initial={{ y: 16, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.65, duration: 0.5 }}
                  className={styles.statsStrip}
                >
                  {slide.stats.map((s) => (
                    <div key={s.id} className={styles.stat}>
                      <span className={styles.statValue}>{s.value}</span>
                      <span className={styles.statLabel}>{s.label}</span>
                    </div>
                  ))}
                </motion.div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {slidesIn.length > 1 && (
        <div className={styles.slideCounter}>
          <span className={styles.slideNum}>
            {String(current + 1).padStart(2, "0")} / {String(slidesIn.length).padStart(2, "0")}
          </span>
          <div className={styles.slideNumLine} />
        </div>
      )}

      {slidesIn.length > 1 && (
        <div className={styles.indicators}>
          {slidesIn.map((_, i) => (
            <motion.button
              type="button"
              key={i}
              className={`${styles.dot} ${i === current ? styles.activeDot : ""}`}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              whileTap={reduceMotion ? undefined : { scale: 0.9 }}
              whileHover={reduceMotion ? undefined : { scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 22 }}
            >
              {i === current && <div key={current} className={styles.activeDotFill} />}
            </motion.button>
          ))}
        </div>
      )}

      {slidesIn.length > 1 && (
        <div className={styles.controls}>
          <button type="button" className={styles.controlBtn} onClick={prev}>
            <ChevronLeft size={22} />
          </button>
          <button type="button" className={styles.controlBtn} onClick={next}>
            <ChevronRight size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
