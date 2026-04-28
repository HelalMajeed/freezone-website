/** Browser: same-origin `/api` (Vite proxy → Express). Production: set `VITE_API_URL` if API is on another origin. */
export function getApiInternalBase(): string {
  const raw = import.meta.env.VITE_API_URL?.trim();
  return raw ? raw.replace(/\/$/, "") : "";
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
