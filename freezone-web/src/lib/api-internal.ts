/**
 * Default API origin for production builds when `VITE_API_URL` is unset (e.g. Netlify split
 * hosting). Override with `VITE_API_URL` for a custom API domain. Never append `/api` here.
 */
export const DEFAULT_PRODUCTION_FREEZONE_API_ORIGIN = "https://freezone-website.fly.dev";

/**
 * Browser base URL for the Freezone Express API (no path suffix).
 * - Local dev: leave `VITE_API_URL` unset so this returns `""` and requests use same-origin
 *   `/api/...` (Vite proxy → port 4000).
 * - Production: if env is unset, uses {@link DEFAULT_PRODUCTION_FREEZONE_API_ORIGIN} so
 *   Netlify does not silently hit `https://<netlify-site>/api/...` (which has no API).
 * - Custom domain: set `VITE_API_URL` (or `VITE_STOREFRONT_API_URL`) to the API origin only,
 *   e.g. `https://api.example.com` — no trailing slash, no `/api` suffix.
 */
export function getApiInternalBase(): string {
  const raw =
    import.meta.env.VITE_API_URL?.trim() ||
    import.meta.env.VITE_STOREFRONT_API_URL?.trim() ||
    "";
  if (raw) return raw.replace(/\/$/, "");
  if (import.meta.env.PROD) return DEFAULT_PRODUCTION_FREEZONE_API_ORIGIN.replace(/\/$/, "");
  return "";
}

/** Absolute URL for Express routes under `/api/...` (storefront + admin client fetches). */
export function freezoneApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getApiInternalBase()}${p}`;
}

const DEFAULT_INTERNAL_API_TIMEOUT_MS = 8000;

export function getInternalApiFetchSignal(): AbortSignal {
  const n = Number(import.meta.env.INTERNAL_API_FETCH_TIMEOUT_MS);
  const ms = Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERNAL_API_TIMEOUT_MS;
  return AbortSignal.timeout(ms);
}

export async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiInternalBase();
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const url = base ? `${base}${pathPart}` : pathPart;
  const res = await fetch(url, {
    ...init,
    signal: init?.signal ?? getInternalApiFetchSignal(),
    credentials: init?.credentials ?? "include",
  });
  if (!res.ok) {
    throw new Error(`API ${res.status} ${url}`);
  }
  return res.json() as Promise<T>;
}
