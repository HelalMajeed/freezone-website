import { create } from "zustand";
import { persist } from "zustand/middleware";

type StorefrontUserState = {
  /** Set true after successful sign-in (OTP wired later). */
  isLoggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  logout: () => void;
};

export const useStorefrontUser = create<StorefrontUserState>()(
  persist(
    (set) => ({
      isLoggedIn: false,
      setLoggedIn: (v) => set({ isLoggedIn: v }),
      logout: () => set({ isLoggedIn: false }),
    }),
    { name: "fz-storefront-user" }
  )
);
