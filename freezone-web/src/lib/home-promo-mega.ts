import type { Category } from "@/lib/data";

export type PromoMegaSlotDraft = { slug: string; imageUrl?: string };

export function parsePromoMegaSlots(raw: unknown): PromoMegaSlotDraft[] {
  if (!Array.isArray(raw)) return [];
  const out: PromoMegaSlotDraft[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const o = item as Record<string, unknown>;
    const slug = typeof o.slug === "string" ? o.slug.trim() : "";
    const imageUrl = typeof o.imageUrl === "string" ? o.imageUrl.trim() : "";
    if (!slug) continue;
    if (imageUrl) out.push({ slug, imageUrl });
    else out.push({ slug });
  }
  return out;
}

/** Cards to show (1–6). Default 5 matches legacy homepage slice. */
export function promoMegaCardCount(payload: Record<string, unknown> | undefined): number {
  const c =
    payload && typeof payload.count === "number" && Number.isFinite(payload.count)
      ? Math.floor(payload.count as number)
      : 5;
  return Math.min(6, Math.max(1, c));
}

/**
 * Resolves mega-block cards: optional `slots` (slug + optional image) in order;
 * otherwise first `count` categories by catalog order. Images prefer slot override,
 * then `category.img`, then stock fallbacks.
 */
export function resolvePromoMegaCards(
  categories: Category[],
  payload: Record<string, unknown> | undefined,
  stockImages: string[],
): { cat: Category; imageUrl: string }[] {
  const count = promoMegaCardCount(payload);
  const slots = parsePromoMegaSlots(payload?.slots);
  const bySlug = new Map(categories.map((c) => [c.id, c]));

  if (slots.length > 0) {
    const cards: { cat: Category; imageUrl: string }[] = [];
    for (const s of slots) {
      if (cards.length >= count) break;
      const cat = bySlug.get(s.slug);
      if (!cat) continue;
      const fromSlot = s.imageUrl?.trim() ?? "";
      const fromCat = cat.img?.trim() ?? "";
      const imageUrl =
        fromSlot || fromCat || stockImages[cards.length % Math.max(1, stockImages.length)];
      cards.push({ cat, imageUrl });
    }
    if (cards.length > 0) return cards;
  }

  const list = categories.slice(0, count);
  return list.map((cat, i) => ({
    cat,
    imageUrl: cat.img?.trim() || stockImages[i % Math.max(1, stockImages.length)],
  }));
}
