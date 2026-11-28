import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * What the site remembers about this visitor, in this browser only (localStorage):
 * favourite products, recently viewed products, recent searches and the details
 * typed on the order form. Nothing here is sent anywhere — the order itself goes
 * out as a WhatsApp message the visitor sends (see CheckoutPage).
 */

export type ReceiveMethod = "delivery" | "pickup";

export type CustomerDetails = {
  name: string;
  phone: string;
  /** Governorate code (src/lib/iraq-provinces.ts), "" until chosen. */
  city: string;
  address: string;
  method: ReceiveMethod;
};

export const EMPTY_CUSTOMER: CustomerDetails = { name: "", phone: "", city: "", address: "", method: "delivery" };

const MAX_RECENT = 12;
const MAX_SEARCHES = 6;
const MAX_FAVORITES = 200;

type SitePrefsState = {
  /** Product ids, newest first. */
  favorites: string[];
  /** Product ids of pages opened, newest first. */
  recent: string[];
  /** Search texts used, newest first. */
  searches: string[];
  customer: CustomerDetails;
  /** Adds or removes; returns nothing — read `favorites` for the new state. */
  toggleFavorite: (id: string) => void;
  clearFavorites: () => void;
  seen: (id: string) => void;
  addSearch: (q: string) => void;
  removeSearch: (q: string) => void;
  setCustomer: (patch: Partial<CustomerDetails>) => void;
};

export const useSitePrefs = create<SitePrefsState>()(
  persist(
    (set) => ({
      favorites: [],
      recent: [],
      searches: [],
      customer: EMPTY_CUSTOMER,
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((x) => x !== id)
            : [id, ...s.favorites].slice(0, MAX_FAVORITES),
        })),
      clearFavorites: () => set({ favorites: [] }),
      seen: (id) => set((s) => (s.recent[0] === id ? s : { recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, MAX_RECENT) })),
      addSearch: (q) => {
        const text = q.trim();
        if (text.length < 2) return;
        set((s) => ({
          searches: [text, ...s.searches.filter((x) => x.toLowerCase() !== text.toLowerCase())].slice(0, MAX_SEARCHES),
        }));
      },
      removeSearch: (q) => set((s) => ({ searches: s.searches.filter((x) => x !== q) })),
      setCustomer: (patch) => set((s) => ({ customer: { ...s.customer, ...patch } })),
    }),
    {
      name: "fz-site-prefs-v1",
      partialize: (s) => ({ favorites: s.favorites, recent: s.recent, searches: s.searches, customer: s.customer }),
      /** A saved value from an older shape must never break the page. */
      merge: (saved, current) => {
        const v = (saved ?? {}) as Partial<SitePrefsState>;
        const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === "string") : []);
        const c = (v.customer ?? {}) as Partial<CustomerDetails>;
        const text = (x: unknown) => (typeof x === "string" ? x : "");
        return {
          ...current,
          favorites: ids(v.favorites),
          recent: ids(v.recent),
          searches: ids(v.searches),
          customer: {
            name: text(c.name),
            phone: text(c.phone),
            city: text(c.city),
            address: text(c.address),
            method: c.method === "pickup" ? "pickup" : "delivery",
          },
        };
      },
    },
  ),
);
