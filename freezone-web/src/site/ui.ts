import { create } from "zustand";

/**
 * Short-lived interface state shared across the storefront: the messages that
 * pop up after an action ("added to cart"), whether the search panel or the phone menu is open,
 * and how much room a page's own bottom bar takes (so floating buttons and
 * messages sit above it). Nothing here is saved.
 */

export type SiteToast = {
  id: number;
  text: string;
  /** Optional button inside the message, e.g. "View cart". */
  action?: { label: string; run: () => void };
};

type SiteUiState = {
  toasts: SiteToast[];
  searchOpen: boolean;
  /** The phone menu (a panel sliding in from the side). */
  menuOpen: boolean;
  /** Height in px of a bar fixed to the bottom of the screen (0 = none). */
  bottomBar: number;
  pushToast: (text: string, action?: SiteToast["action"]) => void;
  dismissToast: (id: number) => void;
  clearToasts: () => void;
  setSearchOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setBottomBar: (px: number) => void;
};

let nextId = 1;
/** One message at a time on screen is enough; a new one replaces the old. */
const MAX_TOASTS = 2;

export const useSiteUi = create<SiteUiState>()((set) => ({
  toasts: [],
  searchOpen: false,
  menuOpen: false,
  bottomBar: 0,
  pushToast: (text, action) => set((s) => ({ toasts: [...s.toasts, { id: nextId++, text, action }].slice(-MAX_TOASTS) })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set((s) => (s.toasts.length ? { toasts: [] } : s)),
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  setMenuOpen: (menuOpen) => set({ menuOpen }),
  setBottomBar: (bottomBar) => set({ bottomBar }),
}));

/** Show a message from anywhere (event handlers, not during render). */
export function toast(text: string, action?: SiteToast["action"]): void {
  useSiteUi.getState().pushToast(text, action);
}
