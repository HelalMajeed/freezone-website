"use client";

import type { ReactNode } from "react";

export type RevealDirection = "up" | "down" | "left" | "right" | "scale";

type Props = {
  children: ReactNode;
  className?: string;
  /** Kept for API compatibility; no animation is applied. */
  delay?: number;
  amount?: number;
  direction?: RevealDirection;
};

/** Static wrapper — entrance motion was removed for faster, snappier navigations. */
export function MotionReveal({ children, className }: Props) {
  return <div className={className}>{children}</div>;
}
