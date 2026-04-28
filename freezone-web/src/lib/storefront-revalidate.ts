/** Client-side stale-time hint (seconds) for TanStack Query — not server ISR. */
export function getStorefrontRevalidateSeconds(): number {
  const n = parseInt(import.meta.env.VITE_STOREFRONT_REVALIDATE_SECONDS ?? "", 10);
  if (Number.isFinite(n) && n >= 60) return Math.min(n, 86400);
  return 300;
}
