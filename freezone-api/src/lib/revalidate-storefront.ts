import { STOREFRONT_DATA_TAG } from "./storefront-cache-tag";
import { invalidateCatalogCaches } from "./catalog";

/** Invalidate storefront caches after admin mutations / imports. */
export function revalidateStorefrontData(): void {
  // Primary path for THIS deployment: drop the in-process catalog TTL caches so
  // edits/imports are visible immediately instead of up to one TTL later.
  invalidateCatalogCaches();

  // Legacy best-effort ping kept for the (unused) Next.js storefront target;
  // it is a no-op here and must never throw.
  const origin = process.env.NEXT_INTERNAL_ORIGIN?.replace(/\/$/, "") || "http://127.0.0.1:3000";
  const secret = process.env.REVALIDATE_SECRET || "";
  void fetch(`${origin}/api/internal/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag: STOREFRONT_DATA_TAG, secret }),
  }).catch(() => {});
}
