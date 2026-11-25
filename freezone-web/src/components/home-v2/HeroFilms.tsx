import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "@/i18n/hooks";
import { HERO_NAMES, HERO_SCENES } from "./generated/heroScenes";
import styles from "./HomeV2.module.css";

/** Each banner stays this long before the next one comes in. */
const BANNER_MS = 4000;
const COUNT = HERO_SCENES.length;
/** Six different switches, used in turn (see generated/homeMotion.css: fzh-t1…6 / fzh-o1…6). */
const TRANSITIONS = 6;

type HeroState = {
  /** Banner on screen. */
  slide: number;
  /** Banner that is leaving (-1 before the first switch). */
  prev: number;
  /** Which switch is playing: 0 = none yet, then 1…6 in turn. */
  tr: number;
};

/**
 * Home hero: six fixed banners. Each one is a set of layers (the empty set, the
 * lettering, each product) that plays a short opening when it comes on screen;
 * all motion is CSS, driven by the class on each banner.
 *
 * Only the banner on screen and the next one are in the page at first, so the
 * first paint downloads one banner's pictures, not all six.
 */
export function HeroFilms() {
  const t = useTranslations("HomeV2");
  const [state, setState] = useState<HeroState>({ slide: 0, prev: -1, tr: 0 });
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  /** Bumped when the visitor picks a banner, so the timer starts counting again. */
  const [timerKey, setTimerKey] = useState(0);

  const go = useCallback((k: number) => {
    setState((s) => (k === s.slide ? s : { slide: k, prev: s.slide, tr: (s.tr % TRANSITIONS) + 1 }));
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setState((s) => ({ slide: (s.slide + 1) % COUNT, prev: s.slide, tr: (s.tr % TRANSITIONS) + 1 }));
    }, BANNER_MS);
    return () => window.clearInterval(id);
  }, [timerKey]);

  /** Keep the banner on screen and the one after it in the page. */
  useEffect(() => {
    setMounted((m) => {
      const next = (state.slide + 1) % COUNT;
      if (m.has(state.slide) && m.has(next)) return m;
      const out = new Set(m);
      out.add(state.slide);
      out.add(next);
      return out;
    });
  }, [state.slide]);

  /** Once the page is idle, bring in the rest so a picked banner is ready at once. */
  useEffect(() => {
    const all = () => setMounted(new Set(HERO_SCENES.map((_, k) => k)));
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const id = window.setTimeout(() => (w.requestIdleCallback ? w.requestIdleCallback(all, { timeout: 4000 }) : all()), 2500);
    return () => window.clearTimeout(id);
  }, []);

  const { slide, prev, tr } = state;

  return (
    <section className={styles.cover} aria-roledescription="carousel" aria-label={t("heroLabel")}>
      {HERO_SCENES.map((html, k) => {
        const phase =
          k === slide
            ? `fzh-bn-on${tr ? ` fzh-bn-t${tr}` : ""}`
            : k === prev
              ? `fzh-bn-out fzh-bn-o${tr}`
              : "fzh-bn-off";
        return (
          <div
            key={k}
            className={`${styles.slide} fzh-bn${k === 0 ? " fzh-bn-first" : ""} ${phase}`}
            aria-hidden={k !== slide}
            /* Static, generated markup (generated/heroScenes.ts) — never user data. */
            dangerouslySetInnerHTML={mounted.has(k) ? { __html: html } : undefined}
          />
        );
      })}
      <div className={`${styles.fx} ${styles.fxUnder} fzh-fx ${tr ? `fzh-fx-t${tr}` : ""}`} aria-hidden="true">
        <span className={`${styles.fxFill} fzh-fx-z`} style={{ background: "#C90000" }} />
      </div>
      <div className={`${styles.fx} ${styles.fxTop} fzh-fx ${tr ? `fzh-fx-t${tr}` : ""}`} aria-hidden="true">
        <span className={`${styles.fxFill} fzh-fx-b1`} style={{ background: "#0a0a0a" }} />
        <span className={`${styles.fxFill} fzh-fx-b2`} style={{ background: "#C90000" }} />
        <span className={`${styles.fxFill} fzh-fx-b3`} style={{ background: "#ffffff" }} />
        <span className={`${styles.fxFill} fzh-fx-line`} style={{ background: "#C90000" }} />
        <span className={`${styles.fxSheen} ${tr % 2 ? "fzh-sh-a" : "fzh-sh-b"}`} />
      </div>
      <div className={styles.dotsBar}>
        <div className={styles.dots}>
          {HERO_NAMES.map((name, k) => (
            <button
              key={name}
              type="button"
              className={`${styles.dot} ${k === slide ? styles.dotOn : ""}`}
              aria-label={t("heroDot", { n: k + 1, name })}
              aria-current={k === slide ? "true" : undefined}
              onClick={() => {
                go(k);
                setTimerKey((n) => n + 1);
              }}
            >
              <span className={styles.dotMark} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
