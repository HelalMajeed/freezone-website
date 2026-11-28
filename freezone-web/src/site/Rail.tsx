import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "@/i18n/hooks";
import { ChevronIcon } from "./icons";
import styles from "./site.module.css";

/**
 * One line of product cards that scrolls sideways (swipe on touch screens).
 * With a mouse, arrow buttons appear at whichever end still has cards off
 * screen. Works in both directions of writing.
 */
export function Rail({ children }: { children: ReactNode }) {
  const t = useTranslations("Site");
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState({ before: false, after: false });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    /** In Arabic the scroll position counts down from 0, so compare distances, not signs. */
    const gone = Math.abs(el.scrollLeft);
    const next = { before: gone > 4, after: gone + el.clientWidth < el.scrollWidth - 4 };
    setMore((m) => (m.before === next.before && m.after === next.after ? m : next));
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
    };
  }, [measure, children]);

  const step = (forward: boolean) => {
    const el = ref.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: (forward ? 1 : -1) * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: calm ? "auto" : "smooth" });
  };

  return (
    <div className={styles.railBox}>
      <div ref={ref} className={styles.rail}>
        {children}
      </div>
      {more.before ? (
        <button type="button" className={`${styles.railBtn} ${styles.railPrev}`} aria-label={t("railPrev")} onClick={() => step(false)}>
          <ChevronIcon className={styles.flipRtl} />
        </button>
      ) : null}
      {more.after ? (
        <button type="button" className={`${styles.railBtn} ${styles.railNext}`} aria-label={t("railNext")} onClick={() => step(true)}>
          <ChevronIcon className={styles.flipLtr} />
        </button>
      ) : null}
    </div>
  );
}
