/**
 * Standalone admin is served from another origin than freezone-api. When `VITE_API_URL` is set,
 * rewrite same-origin `/api/*` and `/uploads/*` fetch URLs to that API base (no change to commerce
 * fetches — those use absolute URLs from `commerce-api.ts`).
 */
const raw = import.meta.env.VITE_API_URL?.trim();
if (raw) {
  const base = raw.replace(/\/$/, "");
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
