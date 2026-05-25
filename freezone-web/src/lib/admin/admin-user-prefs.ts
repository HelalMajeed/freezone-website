const GOAL_KEY = "admin-daily-goal";
const QUICK_ACTIONS_KEY = "admin-quick-actions-order";
const DARK_KEY = "admin-dark-mode";
const INBOX_READ_KEY = "admin-inbox-read-ids";

export function getDailyGoal(userId: number | null): number {
  try {
    const v = localStorage.getItem(`${GOAL_KEY}:${userId ?? "legacy"}`);
    const n = parseInt(v ?? "10", 10);
    return Number.isFinite(n) && n > 0 ? n : 10;
  } catch {
    return 10;
  }
}

export function setDailyGoal(userId: number | null, n: number): void {
  localStorage.setItem(`${GOAL_KEY}:${userId ?? "legacy"}`, String(Math.max(1, n)));
}

export function isDarkMode(): boolean {
  try {
    return localStorage.getItem(DARK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setDarkMode(on: boolean): void {
  localStorage.setItem(DARK_KEY, on ? "1" : "0");
  document.documentElement.classList.toggle("dark", on);
}

export function applyDarkModeFromStorage(): void {
  document.documentElement.classList.toggle("dark", isDarkMode());
}

export type QuickActionId = "new_product" | "new_category" | "import_csv" | "review" | "reports";

export const DEFAULT_QUICK_ACTIONS: QuickActionId[] = [
  "new_product",
  "new_category",
  "import_csv",
  "review",
  "reports",
];

export function getQuickActionsOrder(userId: number | null): QuickActionId[] {
  try {
    const raw = localStorage.getItem(`${QUICK_ACTIONS_KEY}:${userId ?? "legacy"}`);
    if (!raw) return DEFAULT_QUICK_ACTIONS;
    const parsed = JSON.parse(raw) as QuickActionId[];
    return Array.isArray(parsed) ? parsed : DEFAULT_QUICK_ACTIONS;
  } catch {
    return DEFAULT_QUICK_ACTIONS;
  }
}

export function setQuickActionsOrder(userId: number | null, order: QuickActionId[]): void {
  localStorage.setItem(`${QUICK_ACTIONS_KEY}:${userId ?? "legacy"}`, JSON.stringify(order));
}

export function loadInboxReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(INBOX_READ_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

export function saveInboxReadIds(ids: Set<string>): void {
  localStorage.setItem(INBOX_READ_KEY, JSON.stringify([...ids].slice(-500)));
}

export function markInboxRead(id: string): void {
  const s = loadInboxReadIds();
  s.add(id);
  saveInboxReadIds(s);
}

export function markAllInboxRead(ids: string[]): void {
  const s = loadInboxReadIds();
  ids.forEach((id) => s.add(id));
  saveInboxReadIds(s);
}
