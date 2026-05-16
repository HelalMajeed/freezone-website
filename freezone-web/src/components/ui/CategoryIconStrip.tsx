"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/navigation";
import styles from "./CategoryIconStrip.module.css";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EASE_OUT } from "@/lib/motion";
import { useStorefront } from "@/components/providers/StorefrontProvider";
import { inferCategoryIconKey } from "@/lib/category-icon-auto";
import { LucideByName } from "@/lib/lucide-icon-map";
import type { PublicSpotlightItem } from "@/lib/layout-cms";

const SCROLL_STEP = 280;
const DRAG_THRESHOLD_PX = 6;

function iconKeyForSpot(cat: PublicSpotlightItem): string {
  if (cat.iconKey?.trim()) return cat.iconKey.trim();
  const slug = decodeURIComponent(cat.href.match(/[?&]cat=([^&]+)/)?.[1] ?? "");
  return inferCategoryIconKey(slug, cat.label, cat.label);
}

const containerV = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.06 } },
};

const itemV = {
  hidden: { opacity: 0, y: 14, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.38, ease: EASE_OUT } },
};

const itemStatic = { hidden: { opacity: 1, y: 0, scale: 1 }, show: { opacity: 1, y: 0, scale: 1 } };

export function CategoryIconStrip({ previewSpots }: { previewSpots?: PublicSpotlightItem[] }) {
  const { home } = useStorefront();
  const items = previewSpots ?? home.spotlights;
  const reduce = useReducedMotion();
  const iv = reduce ? itemStatic : itemV;
  const cv = reduce ? { hidden: {}, show: {} } : containerV;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ active: false, moved: false, startX: 0, startScroll: 0, pointerId: -1 });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [dragging, setDragging] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    const pos = Math.abs(el.scrollLeft);
    setCanPrev(pos > 4);
    setCanNext(pos < max - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateEdges();
    const ro = new ResizeObserver(() => updateEdges());
    ro.observe(el);
    el.addEventListener("scroll", updateEdges, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", updateEdges);
    };
  }, [items.length, updateEdges]);

  const scrollByStep = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === "rtl";
    const delta = direction * SCROLL_STEP * (rtl ? -1 : 1);
    el.scrollBy({ left: delta, behavior: reduce ? "auto" : "smooth" });
  }, [reduce]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollerRef.current;
    if (!el) return;
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      pointerId: e.pointerId,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    const el = scrollerRef.current;
    if (!el) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD_PX) return;
    drag.moved = true;
    el.scrollLeft = drag.startScroll - dx;
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    setDragging(false);
    const el = scrollerRef.current;
    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    updateEdges();
  }, [updateEdges]);

  const blockClickIfDragged = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }, []);

  if (items.length === 0) return null;

  return (
    <motion.div
      className={styles.stripWrapper}
      variants={cv}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-24px" }}
    >
      <div className={`container ${styles.carousel}`}>
        <button
          type="button"
          className={styles.navBtn}
          style={{ visibility: canPrev ? "visible" : "hidden" }}
          onClick={() => scrollByStep(-1)}
          aria-label="تمرير الأقسام للخلف"
        >
          <ChevronLeft size={22} strokeWidth={2.25} aria-hidden />
        </button>

        <div
          ref={scrollerRef}
          className={`${styles.scroller}${dragging ? ` ${styles.scrollerDragging}` : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={endDrag}
        >
          <div className={styles.track}>
            {items.map((cat) => (
              <motion.div
                key={cat.id}
                className={styles.itemOuter}
                variants={iv}
                whileHover={reduce ? undefined : { y: -3 }}
                transition={{ type: "spring", stiffness: 400, damping: 22 }}
              >
                <Link href={cat.href} className={styles.item} onClick={blockClickIfDragged} draggable={false}>
                  <div className={styles.iconCircle} aria-hidden>
                    <LucideByName name={iconKeyForSpot(cat)} size={26} strokeWidth={1.5} />
                  </div>
                  <span className={styles.label}>{cat.label}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className={`${styles.navBtn} ${styles.navBtnEnd}`}
          style={{ visibility: canNext ? "visible" : "hidden" }}
          onClick={() => scrollByStep(1)}
          aria-label="تمرير الأقسام للأمام"
        >
          <ChevronRight size={22} strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}
