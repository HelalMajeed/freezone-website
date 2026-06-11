import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from './data';
import { trackAddToCart } from './analytics';

export interface CartItem extends Product {
  qty: number;
}

export function computeCartTotals(
  items: CartItem[],
  freeDeliveryThreshold: number,
  standardShippingFee: number,
  couponDiscount: number,
) {
  const subtotal = items.reduce((s, item) => s + item.price * item.qty, 0);
  const afterDiscount = Math.max(0, subtotal - couponDiscount);
  const shipping = afterDiscount >= freeDeliveryThreshold ? 0 : standardShippingFee;
  const grandTotal = afterDiscount + shipping;
  return { subtotal, afterDiscount, shipping, grandTotal, couponDiscount };
}

export function computeCheckoutTotals(
  items: CartItem[],
  opts: { pickup: boolean; threshold: number; shipFee: number; couponDiscount: number },
) {
  const subtotal = items.reduce((s, item) => s + item.price * item.qty, 0);
  const afterDiscount = Math.max(0, subtotal - opts.couponDiscount);
  const shipping = opts.pickup ? 0 : afterDiscount >= opts.threshold ? 0 : opts.shipFee;
  const grandTotal = afterDiscount + shipping;
  return { subtotal, afterDiscount, shipping, grandTotal };
}

interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  couponCode: string | null;
  couponDiscount: number;
  addItem: (product: Product, quantity?: number) => void;
  addMultipleItems: (products: Product[]) => void;
  removeItem: (id: number) => void;
  updateQty: (id: number, qty: number) => void;
  toggleCart: (open?: boolean) => void;
  clearCart: () => void;
  setCoupon: (code: string | null, discount: number) => void;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      couponCode: null,
      couponDiscount: 0,
      setCoupon: (code, discount) => set({ couponCode: code, couponDiscount: discount }),
      addItem: (product, quantity = 1) => {
        const { items } = get();
        const existing = items.find((i) => i.id === product.id);
        if (existing) {
          set({ items: items.map((i) => i.id === product.id ? { ...i, qty: i.qty + quantity } : i) });
        } else {
          set({ items: [...items, { ...product, qty: quantity }] });
        }
        set({ isOpen: true });
        trackAddToCart(
          { id: product.id, name: product.name, price: product.price, brand: product.brand, category: product.cat },
          quantity,
        );
      },
      addMultipleItems: (products) => {
        const { items } = get();
        let newItems = [...items];
        
        products.forEach(product => {
          const existingConfig = newItems.find((i) => i.id === product.id);
          if (existingConfig) {
            newItems = newItems.map((i) => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
          } else {
            newItems.push({ ...product, qty: 1 });
          }
        });
        
        set({ items: newItems, isOpen: true });
      },
      removeItem: (id) => set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      updateQty: (id, qty) => {
        if (qty <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({ items: state.items.map((i) => i.id === id ? { ...i, qty } : i) }));
      },
      clearCart: () => {
        set({ items: [], couponCode: null, couponDiscount: 0 });
      },
      toggleCart: (open) => set((state) => ({ isOpen: open !== undefined ? open : !state.isOpen })),
    }),
    {
      name: 'storefront-cart-storage',
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
      }),
    }
  )
);
