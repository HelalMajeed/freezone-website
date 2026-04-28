"use client";

import styles from "./admin-categories.module.css";

type Props = {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  "aria-label"?: string;
};

export function CategorySearchBar({ value, onChange, placeholder, "aria-label": aria }: Props) {
  return (
    <input
      type="search"
      className={styles.search}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={aria}
    />
  );
}
