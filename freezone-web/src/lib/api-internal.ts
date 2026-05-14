/**
 * Browser base URL for the Freezone Express API (no path suffix).
 * - Local dev: leave empty so requests use same-origin `/api/...` (Vite proxy → port 4000).
 * - Netlify / split hosting: set `VITE_API_URL` (or `VITE_STOREFRONT_API_URL`) to the API **origin only**,
 *   e.g. `https://api.example.com` — no trailing slash, no `/api` suffix.
 */
export function getApiInternalBase(): string {
  const raw =
    import.meta.env.VITE_API_URL?.trim() ||
    import.meta.env.VITE_STOREFRONT_API_URL?.trim() ||
    "";
  return raw ? raw.replace(/\/$/, "") : "";
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
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
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
