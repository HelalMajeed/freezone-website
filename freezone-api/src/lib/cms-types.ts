/** Overlay element on hero image (freeform / “PowerPoint” mode) */
export type HeroFreeformLayer =
  | {
      id: string;
      type: "text";
      /** Percent 0–100 from left */
      x: number;
      y: number;
      widthPct: number;
      textEn: string;
      textAr: string;
      fontSizePx: number;
      color: string;
      fontWeight: number;
      textAlign: "left" | "center" | "right";
      zIndex: number;
    }
  | {
      id: string;
      type: "button";
      x: number;
      y: number;
      labelEn: string;
      labelAr: string;
      href: string;
      variant: "primary" | "secondary";
      zIndex: number;
    };

export type StoredNavColumn = {
  titleEn: string;
  titleAr: string;
  highlight?: boolean;
  cta?: boolean;
  items: { labelEn: string; labelAr: string; href: string }[];
};

export type StoredNavItem = {
  id: string;
  labelEn: string;
  labelAr: string;
  href: string;
  iconKey: string;
  columns: StoredNavColumn[];
};

export function parseFreeformLayers(raw: unknown): HeroFreeformLayer[] | null {
  if (!Array.isArray(raw)) return null;
  const out: HeroFreeformLayer[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const type = o.type === "text" || o.type === "button" ? o.type : null;
    if (!id || !type) continue;
    if (type === "text") {
      out.push({
        id,
        type: "text",
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        widthPct: Number(o.widthPct) || 40,
        textEn: String(o.textEn ?? ""),
        textAr: String(o.textAr ?? ""),
        fontSizePx: Number(o.fontSizePx) || 16,
        color: String(o.color ?? "#ffffff"),
        fontWeight: Number(o.fontWeight) || 400,
        textAlign: o.textAlign === "center" || o.textAlign === "right" ? o.textAlign : "left",
        zIndex: Number(o.zIndex) || 1,
      });
    } else {
      out.push({
        id,
        type: "button",
        x: Number(o.x) || 0,
        y: Number(o.y) || 0,
        labelEn: String(o.labelEn ?? ""),
        labelAr: String(o.labelAr ?? ""),
        href: String(o.href ?? "/products"),
        variant: o.variant === "secondary" ? "secondary" : "primary",
        zIndex: Number(o.zIndex) || 2,
      });
    }
  }
  return out.length ? out : null;
}

export function parseStoredNavItems(raw: unknown): StoredNavItem[] | null {
  if (!Array.isArray(raw)) return null;
  const out: StoredNavItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const labelEn = typeof o.labelEn === "string" ? o.labelEn : "";
    const labelAr = typeof o.labelAr === "string" ? o.labelAr : "";
    const href = typeof o.href === "string" ? o.href : "/products";
    const iconKey = typeof o.iconKey === "string" ? o.iconKey : "package";
    const columns: StoredNavColumn[] = [];
    if (Array.isArray(o.columns)) {
      for (const c of o.columns) {
        if (!c || typeof c !== "object") continue;
        const col = c as Record<string, unknown>;
        const titleEn = typeof col.titleEn === "string" ? col.titleEn : "";
        const titleAr = typeof col.titleAr === "string" ? col.titleAr : "";
        const items: StoredNavColumn["items"] = [];
        if (Array.isArray(col.items)) {
          for (const it of col.items) {
            if (!it || typeof it !== "object") continue;
            const i = it as Record<string, unknown>;
            items.push({
              labelEn: String(i.labelEn ?? ""),
              labelAr: String(i.labelAr ?? ""),
              href: String(i.href ?? "#"),
            });
          }
        }
        columns.push({
          titleEn,
          titleAr,
          highlight: Boolean(col.highlight),
          cta: Boolean(col.cta),
          items,
        });
      }
    }
    if (id && columns.length) out.push({ id, labelEn, labelAr, href, iconKey, columns });
  }
  return out.length ? out : null;
}
