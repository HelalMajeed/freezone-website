/** Commerce admin API base, e.g. `http://127.0.0.1:3020/v1` (routes are `/v1/admin/...`, not `/api/v1/...`). */
export function apiBase(): string {
  return import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3020/v1";
}

export async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}
