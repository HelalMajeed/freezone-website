"use client";

import type { ReactNode } from "react";
import styles from "./admin-categories.module.css";

type Props = {
  children: ReactNode;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
};

export function CategoryGrid({ children, onDragOver, onDrop }: Props) {
  return (
    <div
      className={styles.grid}
      onDragOver={
        onDragOver ??
        ((e) => {
          e.preventDefault();
        })
      }
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}
