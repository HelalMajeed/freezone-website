import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The visitor's chosen products, kept in this browser (localStorage). There is no
 * online checkout on this site: the cart is a list the visitor sends to the store
 * over WhatsApp (see CartPanel and CheckoutPage).
 */
type SiteCartState = {
  /** Product id → quantity. */
  items: Record<string, number>;
  /** Whether the cart panel is showing (not persisted). */
  open: boolean;
  /** Adds `qty` (1 unless given) of a product. */
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  setOpen: (open: boolean) => void;
};

export const MAX_QTY = 99;

export const useSiteCart = create<SiteCartState>()(
  persist(
    (set) => ({
      items: {},
      open: false,
      add: (id, qty = 1) =>
        set((s) => ({
          items: { ...s.items, [id]: Math.min(MAX_QTY, (s.items[id] ?? 0) + Math.max(1, Math.floor(qty) || 1)) },
        })),
      setQty: (id, qty) =>
        set((s) => {
          const next = { ...s.items };
          const n = Math.floor(qty);
          if (!Number.isFinite(n) || n <= 0) delete next[id];
          else next[id] = Math.min(MAX_QTY, n);
          return { items: next };
        }),
      remove: (id) =>
        set((s) => {
          const next = { ...s.items };
          delete next[id];
          return { items: next };
        }),
      clear: () => set({ items: {} }),
      setOpen: (open) => set({ open }),
    }),
    {
      name: "fz-site-cart-v1",
      partialize: (s) => ({ items: s.items }),
    },
  ),
);

export function cartCount(items: Record<string, number>): number {
  let n = 0;
  for (const id in items) n += items[id];
  return n;
}
