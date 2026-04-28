import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "en" | "ar";

type UiState = {
  locale: Locale;
  sidebarCollapsed: boolean;
  setLocale: (locale: Locale) => void;
  toggleSidebar: () => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      locale: "ar",
      sidebarCollapsed: false,
      setLocale: (locale) => set({ locale }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: "commerce-admin-ui" },
  ),
);
