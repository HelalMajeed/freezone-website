import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Id of the element in SiteLayout that holds everything drawn over the page. */
export const LAYER_ID = "fz-site-layer";

/**
 * Renders its children in the shell's layer (outside the page's size container),
 * so a `position: fixed` bar or viewer made by a page is measured from the
 * screen in every browser.
 */
export function InLayer({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHost(document.getElementById(LAYER_ID));
  }, []);
  return host ? createPortal(children, host) : null;
}
