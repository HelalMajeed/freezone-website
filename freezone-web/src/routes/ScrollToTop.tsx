import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

function forceScrollTop() {
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
  window.scrollTo(0, 0);
}

/**
 * SPA default: new route = view starts at the top (window scroll, not preserved from previous page).
 * Lazy routes (e.g. PC Builder) can mount after the first paint; we scroll again on the next frame
 * and after short delays so scroll anchoring / late layout cannot leave the view at the bottom.
 */
export function ScrollToTop() {
  const { pathname, search } = useLocation();

  useLayoutEffect(() => {
    if (typeof history !== "undefined" && "scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    forceScrollTop();
  }, [pathname, search]);

  useEffect(() => {
    forceScrollTop();
    const id = requestAnimationFrame(() => {
      forceScrollTop();
      requestAnimationFrame(forceScrollTop);
    });
    const t0 = window.setTimeout(forceScrollTop, 0);
    const t1 = window.setTimeout(forceScrollTop, 50);
    const t2 = window.setTimeout(forceScrollTop, 200);

    return () => {
      cancelAnimationFrame(id);
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, search]);

  return null;
}
