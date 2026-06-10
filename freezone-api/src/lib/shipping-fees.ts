import { IRAQ_PROVINCES, normalizeProvince, type ProvinceCode } from "./iraq-provinces";

/**
 * Per-governorate shipping fees (API_CONTRACT §7, ASSUMPTIONS A-5).
 *
 * Source of truth is `SiteConfig.shippingFeesJson` — a partial
 * `{ [provinceCode]: feeIQD }` map keyed by the canonical 18 codes in
 * `iraq-provinces.ts`. Missing keys (or a missing/invalid map) fall back to
 * the flat `standardShippingFee`; `freeDeliveryThreshold` and pickup-is-free
 * still apply. All fees are integer IQD.
 */

/** Storefront/site fallbacks — keep in sync with freezone-web/src/lib/store.ts. */
const DEFAULT_STANDARD_FEE = 5000;
const DEFAULT_FREE_THRESHOLD = 100000;

/** Hard cap for a single province fee (mirrors the admin allowlist validation). */
export const MAX_PROVINCE_FEE = 100000;

export type ShippingFeeConfig = {
  standardShippingFee?: number | null;
  freeDeliveryThreshold?: number | null;
  /** Raw `SiteConfig.shippingFeesJson` (Prisma `Json?`) — sanitized here. */
  shippingFeesJson?: unknown;
};

/** A valid per-province override: integer IQD in [0, MAX_PROVINCE_FEE]. */
function isValidFee(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_PROVINCE_FEE;
}

/**
 * Sanitize a raw `shippingFeesJson` value into a partial code → fee map.
 * Unknown province keys and out-of-range/non-integer fees are dropped rather
 * than throwing, so one stray admin edit never breaks checkout.
 */
export function sanitizeShippingFeesJson(raw: unknown): Partial<Record<ProvinceCode, number>> {
  const out: Partial<Record<ProvinceCode, number>> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const code = normalizeProvince(key);
    if (code && isValidFee(value)) out[code] = value;
  }
  return out;
}

/**
 * Resolve the FULL 18-code fee map (per-province override or flat fallback) —
 * the projection `GET /api/public/site` ships so checkout can show the fee
 * for any selected governorate.
 */
export function resolveShippingFeeMap(config: ShippingFeeConfig): Record<ProvinceCode, number> {
  const standard = isValidFee(config.standardShippingFee) ? config.standardShippingFee : DEFAULT_STANDARD_FEE;
  const overrides = sanitizeShippingFeesJson(config.shippingFeesJson);
  const map = {} as Record<ProvinceCode, number>;
  for (const p of IRAQ_PROVINCES) {
    map[p.code] = overrides[p.code] ?? standard;
  }
  return map;
}

/**
 * Server-side shipping fee for one order:
 *   - pickup → 0 (buyer collects from the store);
 *   - after-discount subtotal ≥ freeDeliveryThreshold → 0;
 *   - otherwise the destination province's fee, falling back to the flat
 *     `standardShippingFee` for unmapped provinces or unrecognized inputs.
 *
 * `province` accepts a canonical code or any label `normalizeProvince`
 * understands (English/Arabic names, aliases).
 */
export function resolveShippingFee(
  province: string | null | undefined,
  subtotal: number,
  config: ShippingFeeConfig,
  options?: { pickup?: boolean },
): number {
  if (options?.pickup) return 0;
  const threshold =
    typeof config.freeDeliveryThreshold === "number" &&
    Number.isFinite(config.freeDeliveryThreshold) &&
    config.freeDeliveryThreshold >= 0
      ? config.freeDeliveryThreshold
      : DEFAULT_FREE_THRESHOLD;
  if (subtotal >= threshold) return 0;

  const standard = isValidFee(config.standardShippingFee) ? config.standardShippingFee : DEFAULT_STANDARD_FEE;
  const code = normalizeProvince(province);
  if (!code) return standard;
  return sanitizeShippingFeesJson(config.shippingFeesJson)[code] ?? standard;
}
