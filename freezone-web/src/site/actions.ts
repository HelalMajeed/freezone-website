import { useCallback } from "react";
import { useLocale, useTranslations } from "@/i18n/hooks";
import { trackAddToCart } from "@/lib/analytics";
import { useSiteCart } from "./cart";
import { plainText, productName, type SiteProduct } from "./catalog";
import { useSitePrefs } from "./prefs";
import { toast } from "./ui";

/**
 * "Add to cart" as every button on the site does it: add, report it to
 * analytics (a no-op unless analytics is configured), and confirm with a
 * message that offers to open the cart.
 */
export function useAddToCart(): (p: SiteProduct, qty?: number) => void {
  const t = useTranslations("Site");
  const locale = useLocale();
  const add = useSiteCart((s) => s.add);
  const setOpen = useSiteCart((s) => s.setOpen);

  return useCallback(
    (p, qty = 1) => {
      if (p.flag === "out") return;
      add(p.id, qty);
      trackAddToCart(
        { id: p.id, name: plainText(productName(p, locale)), price: p.price, brand: p.brand || undefined, category: p.cat },
        qty,
      );
      toast(qty > 1 ? t("toastAddedCount", { count: qty }) : t("toastAdded"), {
        label: t("toastViewCart"),
        run: () => setOpen(true),
      });
    },
    [add, setOpen, t, locale],
  );
}

/** Whether a product is in the favourites, and a toggle that confirms what it did. */
export function useFavorite(id: string): { on: boolean; toggle: () => void } {
  const t = useTranslations("Site");
  const on = useSitePrefs((s) => s.favorites.includes(id));
  const toggleFavorite = useSitePrefs((s) => s.toggleFavorite);
  const toggle = useCallback(() => {
    toggleFavorite(id);
    toast(on ? t("toastFavRemoved") : t("toastFavAdded"));
  }, [toggleFavorite, id, on, t]);
  return { on, toggle };
}
