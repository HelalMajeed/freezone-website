import type { ReactNode } from "react";
import styles from "./TableScroll.module.css";

/** Horizontal scroll container for wide tables on small screens. */
export function TableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={[styles.wrap, "fz-table-scroll", className].filter(Boolean).join(" ")}>{children}</div>;
}
