/**
 * Standalone admin is served from another origin than freezone-api. Rewrite same-origin `/api/*`
 * and `/uploads/*` fetch URLs to the resolved API base (from `VITE_API_URL`, or the production
 * default in `getApiInternalBase()` when unset — same as storefront).
 */
import { getApiInternalBase } from "@/lib/api-internal";

const base = getApiInternalBase();
if (base) {
  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") {
      if (input.startsWith("/api/") || input.startsWith("/uploads/")) {
        return orig(`${base}${input}`, init);
      }
    }
    return orig(input as RequestInfo, init);
  };
}
