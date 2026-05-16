"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import type { PublicMarqueeStrip, PublicTickerSegment } from "@/lib/marquee-strips";
import styles from "./ScrollingMarqueeBar.module.css";

type ScrollingMarqueeBarProps = {
  strip: PublicMarqueeStrip;
};

function SegmentNodes({
  segments,
  textColor,
}: {
  segments: PublicTickerSegment[];
  textColor: string;
}) {
  return (
    <>
      {segments.map((seg, i) => (
        <span key={`${i}-${seg.text.slice(0, 24)}`} className={styles.chunk} style={{ color: textColor }}>
          {seg.href ? (
            <a href={seg.href} className={styles.link} target="_blank" rel="noopener noreferrer">
              {seg.text}
            </a>
          ) : (
            seg.text
          )}
          {i < segments.length - 1 ? <span className={styles.bullet} aria-hidden /> : null}
        </span>
      ))}
    </>
  );
}

function RepeatNodes({
  repeatText,
  separator,
  textColor,
}: {
  repeatText: string;
  separator: string;
  textColor: string;
}) {
  const unit = (
    <span className={styles.chunk} style={{ color: textColor }}>
      <span>{repeatText}</span>
      {separator ? <span className={styles.sep}>{separator}</span> : null}
    </span>
  );
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i}>{unit}</span>
      ))}
    </>
  );
}

export function ScrollingMarqueeBar({ strip }: ScrollingMarqueeBarProps) {
  const reduceMotion = useReducedMotion();

  const content = useMemo(() => {
    if (strip.repeatText?.trim()) {
      return (
        <RepeatNodes
          repeatText={strip.repeatText.trim()}
          separator={strip.separator ?? ""}
          textColor={strip.textColor}
        />
      );
    }
    if (strip.segments?.length) {
      return <SegmentNodes segments={strip.segments} textColor={strip.textColor} />;
    }
    return null;
  }, [strip]);

  if (!content) return null;

  const trackClass = reduceMotion
    ? styles.trackStatic
    : strip.direction === "right"
      ? styles.trackRight
      : styles.trackLeft;

  return (
    <div
      className={styles.bar}
      style={{ background: strip.bgColor }}
      role="region"
      aria-label={strip.id === "promo" ? "Promotions" : "Store announcements"}
    >
      <div
        className={styles.inner}
        style={{ ["--marquee-duration" as string]: `${strip.durationSec}s` } as CSSProperties}
      >
        {reduceMotion ? (
          <div className={trackClass}>{content}</div>
        ) : (
          <div className={`${styles.track} ${trackClass}`}>
            <div className={styles.segment}>{content}</div>
            <div className={styles.segment} aria-hidden>
              {content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
