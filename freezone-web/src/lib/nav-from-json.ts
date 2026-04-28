import type { LocaleCode } from "./layout-cms";
import type { StoredNavItem } from "./cms-types";
import type { NavItemResolved, MegaMenuColumn } from "./nav-types";
import { getLucideIcon } from "./lucide-icon-map";

export function storedNavToResolved(items: StoredNavItem[], locale: LocaleCode): NavItemResolved[] {
  const en = locale === "en";
  return items.map((item) => {
    const columns: MegaMenuColumn[] = item.columns.map((c) => ({
      title: en ? c.titleEn : c.titleAr,
      highlight: c.highlight,
      cta: c.cta,
      items: c.items.map((l) => ({
        label: en ? l.labelEn : l.labelAr,
        href: l.href,
      })),
    }));
    return {
      id: item.id,
      label: en ? item.labelEn : item.labelAr,
      href: item.href,
      icon: getLucideIcon(item.iconKey),
      columns,
    };
  });
}
