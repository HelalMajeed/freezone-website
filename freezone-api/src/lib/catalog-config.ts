/** IQD per 1 USD — override via CATALOG_USD_IQD_RATE env. */
export function catalogExchangeRate(): number {
  const raw = process.env.CATALOG_USD_IQD_RATE?.trim();
  const n = raw ? Number.parseFloat(raw) : 1450;
  return Number.isFinite(n) && n > 0 ? n : 1450;
}

export function iqdToSuggestedUsd(priceIqd: number): number {
  const rate = catalogExchangeRate();
  return Math.round((priceIqd / rate) * 100) / 100;
}
