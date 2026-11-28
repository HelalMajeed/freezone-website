import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./HomeV2.module.css";

/**
 * Brings a part of the home page in with a short rise the first time it scrolls
 * into view. Without IntersectionObserver (or with reduced motion, in the
 * stylesheet) the content is simply there.
 */
export function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`${styles.reveal} ${shown ? styles.revealIn : ""} ${className}`}>
      {children}
    </div>
  );
}
