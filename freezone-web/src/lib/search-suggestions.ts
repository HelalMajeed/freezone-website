import { freezoneApiUrl, getInternalApiFetchSignal } from "./api-internal";

const RECENT_KEY = "freezone-search-recent";
const MAX_RECENT = 8;

/**
 * Live suggestions — contract (h) GET /api/public/search-suggestions in
 * fz-ws1-backend/docs/API_CONTRACTS.md. The NavBar falls back to the local
 * trending/recent lists below until the backend endpoint is deployed (or
 * whenever it errors).
 */
export type RemoteSuggestionProduct = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  price: number;
  salePrice: number | null;
  image: string | null;
};

export type RemoteSuggestionTerm = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
};

export type RemoteSuggestions = {
  products: RemoteSuggestionProduct[];
  categories: RemoteSuggestionTerm[];
  brands: RemoteSuggestionTerm[];
  queries: string[];
};

export async function fetchSearchSuggestions(q: string, limit = 8): Promise<RemoteSuggestions> {
  const res = await fetch(
    freezoneApiUrl(`/api/public/search-suggestions?q=${encodeURIComponent(q.trim())}&limit=${limit}`),
    { credentials: "omit", signal: getInternalApiFetchSignal() },
  );
  if (!res.ok) throw new Error(`search-suggestions ${res.status}`);
  const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: Partial<RemoteSuggestions> } | null;
  if (!json?.ok || !json.data) throw new Error("search-suggestions invalid payload");
  return {
    products: Array.isArray(json.data.products) ? json.data.products : [],
    categories: Array.isArray(json.data.categories) ? json.data.categories : [],
    brands: Array.isArray(json.data.brands) ? json.data.brands : [],
    queries: Array.isArray(json.data.queries) ? json.data.queries : [],
  };
}

export function hasRemoteSuggestions(s: RemoteSuggestions | undefined): s is RemoteSuggestions {
  return Boolean(s && (s.products.length || s.categories.length || s.brands.length || s.queries.length));
}

export const TRENDING_SEARCHES = [
  { q: "PS5", label: "PS5 Console" },
  { q: "PS5 controller", label: "PS5 Controller" },
  { q: "SSD PS5", label: "SSD for PS5" },
  { q: "gaming monitor 144hz", label: "Gaming Monitors" },
  { q: "UPS", label: "UPS & power backup" },
  { q: "CCTV", label: "CCTV & security" },
  { q: "smart home", label: "Smart Home" },
  { q: "laptop gaming", label: "Gaming Laptops" },
] as const;

export function readRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

export function pushRecentSearch(q: string) {
  const t = q.trim();
  if (t.length < 2) return;
  const prev = readRecentSearches().filter((x) => x.toLowerCase() !== t.toLowerCase());
  const next = [t, ...prev].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
}

export function filterSuggestions(query: string): { q: string; label: string }[] {
  const t = query.trim().toLowerCase();
  if (!t) return [...TRENDING_SEARCHES];
  return TRENDING_SEARCHES.filter(
    (row) => row.q.toLowerCase().includes(t) || row.label.toLowerCase().includes(t),
  ).slice(0, 8);
}
