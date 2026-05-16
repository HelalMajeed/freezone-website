const RECENT_KEY = "freezone-search-recent";
const MAX_RECENT = 8;

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
