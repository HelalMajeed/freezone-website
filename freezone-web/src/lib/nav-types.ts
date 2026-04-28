import type { LucideIcon } from "lucide-react";

export type MegaMenuColumn = {
  title: string;
  items: { label: string; href: string }[];
  highlight?: boolean;
  cta?: boolean;
};

export type NavItemResolved = {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  columns: MegaMenuColumn[];
};
