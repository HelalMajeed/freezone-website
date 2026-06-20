/**
 * Pricing engine — honest markup rules (IQD integers).
 *
 * - default markup 20%, allowed range 15%–30% (clamped)
 * - per-category defaults (CCTV/security 25, laptops/computers 18, gaming/accessories 25,
 *   monitors/printers/networking 20, power/smart-home 22)
 * - explicit price wins but its implied margin is audited
 * - no base cost AND no explicit price -> price cannot be set (review required, never activated)
 * - oldPrice is honored ONLY when it is a real, higher previous price (never a fake discount)
 * - final price rounded to sensible IQD steps
 */
import type { PricingResult } from "./types";

export const DEFAULT_MARKUP = 20;
export const MIN_MARKUP = 15;
export const MAX_MARKUP = 30;

const CATEGORY_MARKUP: Record<string, number> = {
  cctv: 25,
  security: 25,
  laptops: 18,
  computers: 18,
  "all-in-one": 18,
  gaming: 25,
  accessories: 25,
  components: 25,
  monitors: 20,
  printers: 20,
  networking: 20,
  "power-solutions": 22,
  "smart-home": 22,
  electric: 22,
};

export function defaultMarkupForCategory(categorySlug: string): number {
  return CATEGORY_MARKUP[categorySlug] ?? DEFAULT_MARKUP;
}

export function clampMarkup(p: number): number {
  if (!Number.isFinite(p)) return DEFAULT_MARKUP;
  return Math.min(MAX_MARKUP, Math.max(MIN_MARKUP, Math.round(p)));
}

/** Round to sensible IQD steps by price tier (250 / 500 / 1000). */
export function roundIqd(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const step = value >= 500_000 ? 1000 : value >= 50_000 ? 500 : 250;
  return Math.round(value / step) * step;
}

export interface PricingInput {
  categorySlug: string;
  baseCostIqd: number | null;
  priceIqd: number | null;
  markupPercent: number | null;
  oldPriceIqd: number | null;
}

export function computePricing(input: PricingInput): PricingResult {
  const notes: string[] = [];
  const cost = input.baseCostIqd;
  const explicitPrice = input.priceIqd;

  if (explicitPrice != null && explicitPrice > 0) {
    let margin: number | null = null;
    if (cost != null && cost > 0) {
      margin = round1(((explicitPrice - cost) / cost) * 100);
      if (margin < MIN_MARKUP) notes.push(`implied margin ${margin}% is below the ${MIN_MARKUP}% floor`);
      if (margin > MAX_MARKUP) notes.push(`implied margin ${margin}% is above the ${MAX_MARKUP}% ceiling`);
    } else {
      notes.push("explicit price provided without a base cost — margin cannot be audited");
    }
    const price = roundIqd(explicitPrice);
    return {
      costIqd: cost,
      markupPercent: null,
      priceIqd: price,
      oldPriceIqd: resolveOldPrice(input.oldPriceIqd, price, notes),
      marginPercent: margin,
      source: "explicit_price",
      notes,
    };
  }

  if (cost == null || cost <= 0) {
    notes.push("no base cost and no explicit price — price cannot be computed (review required, not activated)");
    return { costIqd: null, markupPercent: null, priceIqd: null, oldPriceIqd: null, marginPercent: null, source: "none", notes };
  }

  let markup: number;
  if (input.markupPercent != null) {
    markup = clampMarkup(input.markupPercent);
    if (markup !== Math.round(input.markupPercent)) {
      notes.push(`markup ${input.markupPercent}% clamped to allowed range ${MIN_MARKUP}–${MAX_MARKUP}% (${markup}%)`);
    }
  } else {
    markup = defaultMarkupForCategory(input.categorySlug);
  }

  const price = roundIqd(cost * (1 + markup / 100));
  return {
    costIqd: cost,
    markupPercent: markup,
    priceIqd: price,
    oldPriceIqd: resolveOldPrice(input.oldPriceIqd, price, notes),
    marginPercent: markup,
    source: "markup",
    notes,
  };
}

/** Only keep a compare-at price when it is a real, higher previous price. */
function resolveOldPrice(oldPrice: number | null, price: number | null, notes: string[]): number | null {
  if (oldPrice == null || oldPrice <= 0 || price == null) return null;
  if (oldPrice <= price) {
    notes.push("old_price is not higher than price — dropped (no fake discounts)");
    return null;
  }
  return roundIqd(oldPrice);
}

export function marginOutOfRange(margin: number | null): boolean {
  return margin != null && (margin < MIN_MARKUP || margin > MAX_MARKUP);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
