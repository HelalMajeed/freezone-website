import { create } from "zustand";
import { persist } from "zustand/middleware";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentMethod =
  | "cod"
  | "store_pickup"
  | "zaincash"
  | "qicard"
  | "visa"
  | "master";

export interface OrderItem {
  productId: number;
  name: string;
  price: number;
  qty: number;
  image?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    city: string;
  };
  items: OrderItem[];
  /** Line items sum before coupon */
  total: number;
  shipping: number;
  discountTotal?: number;
  couponCode?: string;
  /** Payable total (after coupon + shipping rules) */
  grandTotal?: number;
  paymentMethod: PaymentMethod;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface SiteStore {
  orders: Order[];
  addOrder: (input: {
    customer: Order["customer"];
    items: OrderItem[];
    total: number;
    shipping: number;
    discountTotal?: number;
    couponCode?: string;
    grandTotal?: number;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => { id: string; orderNumber: string };
}

export const useSite = create<SiteStore>()(
  persist(
    (set, get) => ({
      orders: [],
      addOrder: (input) => {
        const now = new Date().toISOString();
        const { orders } = get();
        const maxNum = orders.reduce((max, o) => {
          const m = /^FZ-(\d+)$/.exec(o.orderNumber);
          if (m) return Math.max(max, parseInt(m[1], 10));
          return max;
        }, 1000);
        const orderNumber = `FZ-${String(maxNum + 1).padStart(4, "0")}`;
        const id = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const order: Order = {
          id,
          orderNumber,
          customer: input.customer,
          items: input.items,
          total: input.total,
          shipping: input.shipping,
          discountTotal: input.discountTotal,
          couponCode: input.couponCode,
          grandTotal: input.grandTotal ?? input.total + input.shipping,
          paymentMethod: input.paymentMethod,
          status: "pending",
          notes: input.notes,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        return { id, orderNumber };
      },
    }),
    {
      name: "storefront-site-storage",
      partialize: (state) => ({ orders: state.orders }),
    }
  )
);
