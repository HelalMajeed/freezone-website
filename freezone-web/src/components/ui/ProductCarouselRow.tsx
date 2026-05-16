"use client";

import { createContext, useContext, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useHorizontalScrollCarousel } from "@/hooks/useHorizontalScrollCarousel";
import styles from "./ProductCarouselRow.module.css";

const DragGuardContext = createContext<(e: React.MouseEvent) => void>(() => {});

export function useCarouselDragGuard() {
  return useContext(DragGuardContext);
}

type ProductCarouselRowProps = {
  children: ReactNode;
  /** Item count — used to refresh scroll edge state */
  itemCount: number;
  scrollStep?: number;
  className?: string;
  prevLabel?: string;
  nextLabel?: string;
};

export function ProductCarouselRow({
  children,
  itemCount,
  scrollStep = 320,
  className,
  prevLabel = "تمرير للخلف",
  nextLabel = "تمرير للأمام",
}: ProductCarouselRowProps) {
  const {
    scrollerRef,
    canPrev,
    canNext,
    dragging,
    scrollByStep,
    onPointerDown,
    onPointerMove,
    endDrag,
    blockClickIfDragged,
  } = useHorizontalScrollCarousel([itemCount], scrollStep);

  return (
    <DragGuardContext.Provider value={blockClickIfDragged}>
      <motion.div
        className={[styles.carousel, className].filter(Boolean).join(" ")}
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-32px" }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <button
          type="button"
          className={styles.navBtn}
          style={{ visibility: canPrev ? "visible" : "hidden" }}
          onClick={() => scrollByStep(-1)}
          aria-label={prevLabel}
        >
          <ChevronLeft size={20} strokeWidth={2.25} aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className={`${styles.track}${dragging ? ` ${styles.trackDragging}` : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          {children}
        </div>

        <button
          type="button"
          className={styles.navBtn}
          style={{ visibility: canNext ? "visible" : "hidden" }}
          onClick={() => scrollByStep(1)}
          aria-label={nextLabel}
        >
          <ChevronRight size={20} strokeWidth={2.25} aria-hidden />
        </button>
      </motion.div>
    </DragGuardContext.Provider>
  );
}
