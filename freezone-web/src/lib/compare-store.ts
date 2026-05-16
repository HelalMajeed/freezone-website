import { create } from "zustand";
import { persist } from "zustand/middleware";

const MAX = 4;

interface CompareStore {
  ids: number[];
  toggle: (id: number) => void;
  has: (id: number) => boolean;
  clear: () => void;
}

export const useCompare = create<CompareStore>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
          return;
        }
        if (ids.length >= MAX) {
          set({ ids: [...ids.slice(1), id] });
          return;
        }
        set({ ids: [...ids, id] });
      },
      has: (id) => get().ids.includes(id),
      clear: () => set({ ids: [] }),
    }),
    { name: "freezone-compare-ids" },
  ),
);
