"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 6;

export function useHorizontalScrollCarousel(deps: unknown[] = [], scrollStep = 320) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset edges when content changes
  }, [...deps, updateEdges]);

  const scrollByStep = useCallback(
    (direction: -1 | 1, smooth = true) => {
      const el = scrollerRef.current;
      if (!el) return;
      const rtl = getComputedStyle(el).direction === "rtl";
      const delta = direction * scrollStep * (rtl ? -1 : 1);
      el.scrollBy({ left: delta, behavior: smooth ? "smooth" : "auto" });
    },
    [scrollStep],
  );

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

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const drag = dragRef.current;
      if (!drag.active) return;
      drag.active = false;
      setDragging(false);
      const el = scrollerRef.current;
      if (el?.hasPointerCapture(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      updateEdges();
    },
    [updateEdges],
  );

  const blockClickIfDragged = useCallback((e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragRef.current.moved = false;
    }
  }, []);

  return {
    scrollerRef,
    canPrev,
    canNext,
    dragging,
    scrollByStep,
    onPointerDown,
    onPointerMove,
    endDrag,
    blockClickIfDragged,
  };
}
