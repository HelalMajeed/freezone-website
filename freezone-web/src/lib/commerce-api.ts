/**
 * Commerce suite (Nest) admin/public API — base URL must include `/v1`, e.g.
 * `https://commerce-admin-api.fly.dev/v1`.
 *
 * Supported env names (first wins):
 * - `VITE_COMMERCE_API_BASE_URL`
 * - `VITE_API_BASE_URL` (used by standalone admin Netlify builds)
 */
function trimBase(s: string | undefined): string {
  return (s ?? "").trim().replace(/\/+$/, "");
}

export function getCommerceApiBase(): string {
  const fromEnv =
    trimBase(import.meta.env.VITE_COMMERCE_API_BASE_URL) || trimBase(import.meta.env.VITE_API_BASE_URL);
  if (fromEnv) return fromEnv;
  if (import.meta.env.DEV) return "http://127.0.0.1:3020/v1";
  return "";
}

export function commerceApiUrl(path: string): string {
  const base = getCommerceApiBase();
  if (!base) {
    throw new Error(
      "Missing commerce API base: set VITE_COMMERCE_API_BASE_URL or VITE_API_BASE_URL (must include /v1).",
    );
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

export async function commerceJson<T>(path: string, init?: RequestInit): Promise<T> {
  const url = commerceApiUrl(path);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    credentials: init?.credentials ?? "omit",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Commerce API ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
