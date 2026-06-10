import type { Category } from "@/lib/data";
import { CATEGORY_PROMO_IMAGE_LABEL_AR } from "@/lib/category-promo-image-spec";

export { CATEGORY_PROMO_IMAGE_LABEL_AR };

/** Max cards in promo mega grid (4×5 layout on desktop). */
export const PROMO_MEGA_MAX_CARDS = 20;

/** Default storefront payload — all catalog categories up to {@link PROMO_MEGA_MAX_CARDS}. */
export const PROMO_MEGA_DEFAULT_PAYLOAD: Record<string, unknown> = {
  count: PROMO_MEGA_MAX_CARDS,
  slots: [],
};

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

/** Cards to show (1–`PROMO_MEGA_MAX_CARDS`). Default fills a 4×5 grid when `count` is omitted. */
export function promoMegaCardCount(payload: Record<string, unknown> | undefined): number {
  const c =
    payload && typeof payload.count === "number" && Number.isFinite(payload.count)
      ? Math.floor(payload.count as number)
      : PROMO_MEGA_MAX_CARDS;
  return Math.min(PROMO_MEGA_MAX_CARDS, Math.max(1, c));
}

/**
 * Resolves mega-block cards: optional `slots` (slug + optional image) in order;
 * otherwise first `count` categories by catalog order. Images prefer slot override,
 * then `category.img`, then stock fallbacks.
 */
/** How many cards to render: all TOP-LEVEL catalog categories (≤ max) unless custom `slots` are set. */
export function resolvePromoMegaCardLimit(
  categories: Category[],
  payload: Record<string, unknown> | undefined,
): number {
  const slots = parsePromoMegaSlots(payload?.slots);
  if (slots.length > 0) {
    return promoMegaCardCount(payload);
  }
  const topLevel = categories.filter((c) => !c.parent);
  if (topLevel.length === 0) return 0;
  return Math.min(PROMO_MEGA_MAX_CARDS, topLevel.length);
}

export function resolvePromoMegaCards(
  categories: Category[],
  payload: Record<string, unknown> | undefined,
  stockImages: string[],
): { cat: Category; imageUrl: string }[] {
  const slots = parsePromoMegaSlots(payload?.slots);
  const count = resolvePromoMegaCardLimit(categories, payload);
  if (count === 0) return [];
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

  /** Default fill: top-level categories only (explicit slots above may still pick children). */
  const list = categories.filter((c) => !c.parent).slice(0, count);
  return list.map((cat, i) => ({
    cat,
    imageUrl: cat.img?.trim() || stockImages[i % Math.max(1, stockImages.length)],
  }));
}
