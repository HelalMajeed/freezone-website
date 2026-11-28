import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/navigation";
import { useTranslations } from "@/i18n/hooks";
import { HERO_NAMES, HERO_SCENES } from "./generated/heroScenes";
import styles from "./HomeV2.module.css";

/**
 * Where a click on each banner goes, in the order of HERO_NAMES. Banners for
 * things the catalogue does not list (custom servers, Epson) open the contact
 * page with the subject already filled in.
 */
const HERO_LINKS: readonly string[] = [
  "/products?brand=Sunell",
  "/contact?topic=quote",
  "/products?brand=ASUS&cat=pc&sub=lap-gaming",
  "/products?cat=cctv",
  "/contact?ask=Epson",
  "/products?brand=EZVIZ",
];

/** A sideways drag longer than this (px) changes the banner instead of opening it. */
const SWIPE_PX = 44;

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
 *
 * The visitor can step through with the arrows (shown on hover), the dots, the
 * keyboard arrows or a swipe; the banners wait while the pointer or the keyboard
 * focus is on them. A click or tap opens what the banner shows.
 */
export function HeroFilms() {
  const t = useTranslations("HomeV2");
  const [state, setState] = useState<HeroState>({ slide: 0, prev: -1, tr: 0 });
  const [mounted, setMounted] = useState<ReadonlySet<number>>(() => new Set([0, 1]));
  /** Bumped when the visitor picks a banner, so the timer starts counting again. */
  const [timerKey, setTimerKey] = useState(0);

  /** Waiting: the pointer is over the banners, or the keyboard focus is inside them. */
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const paused = hover || focus;
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  /** Set by a swipe so the click that ends it does not also open the banner. */
  const swiped = useRef(false);

  const go = useCallback((k: number) => {
    setState((s) => (k === s.slide ? s : { slide: k, prev: s.slide, tr: (s.tr % TRANSITIONS) + 1 }));
  }, []);

  /** Step forward or back; the count starts again from the new banner. */
  const step = useCallback((by: 1 | -1) => {
    setState((s) => ({ slide: (s.slide + by + COUNT) % COUNT, prev: s.slide, tr: (s.tr % TRANSITIONS) + 1 }));
    setTimerKey((n) => n + 1);
  }, []);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setState((s) => ({ slide: (s.slide + 1) % COUNT, prev: s.slide, tr: (s.tr % TRANSITIONS) + 1 }));
    }, BANNER_MS);
    return () => window.clearInterval(id);
  }, [timerKey, paused]);

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
  const isRtl = () => document.documentElement.dir === "rtl";

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
    swiped.current = false;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    swiped.current = true;
    /** Pulling the banner toward the start of the line brings the next one, in either direction of writing. */
    step((dx < 0) !== isRtl() ? 1 : -1);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    step((e.key === "ArrowRight") !== isRtl() ? 1 : -1);
  };

  return (
    <section
      className={styles.cover}
      aria-roledescription="carousel"
      aria-label={t("heroLabel")}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") setHover(true);
      }}
      onPointerLeave={() => setHover(false)}
      onFocus={(e) => {
        /* Keyboard focus only: a tapped dot keeps focus on phones and would hold the banners for good. */
        if ((e.target as HTMLElement).matches(":focus-visible")) setFocus(true);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus(false);
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        drag.current = null;
      }}
      onKeyDown={onKeyDown}
    >
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
      {/* The whole banner is one link (the pictures carry no buttons of their own). */}
      <Link
        href={HERO_LINKS[slide] ?? "/products"}
        className={styles.coverLink}
        aria-label={t("heroOpen", { name: HERO_NAMES[slide] })}
        draggable={false}
        onClick={(e) => {
          if (!swiped.current) return;
          e.preventDefault();
          swiped.current = false;
        }}
      />
      <button type="button" className={`${styles.coverArrow} ${styles.coverPrev}`} aria-label={t("heroPrev")} onClick={() => step(-1)}>
        <CoverChevron />
      </button>
      <button type="button" className={`${styles.coverArrow} ${styles.coverNext}`} aria-label={t("heroNext")} onClick={() => step(1)}>
        <CoverChevron />
      </button>
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
              <span className={styles.dotMark}>
                {k === slide ? (
                  /* Fills while this banner's time runs; re-keyed so it starts again on every change. */
                  <span
                    key={`${slide}-${timerKey}`}
                    className={`${styles.dotFill} ${paused ? styles.dotFillHeld : ""}`}
                    style={{ animationDuration: `${BANNER_MS}ms` }}
                  />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Drawn pointing to the end of the line; the "previous" arrow turns it round in the stylesheet. */
function CoverChevron() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
