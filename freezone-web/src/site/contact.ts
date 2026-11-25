/**
 * Store contact details shown in the header, footer and cart. One place to edit.
 * The street address is a translated string (messages → Site.address).
 */

/** WhatsApp number in international form, digits only (the store default already used across this repo). */
export const WHATSAPP_NUMBER = "9647742222377";
/** The same number as people in Iraq dial it. */
export const WHATSAPP_DISPLAY = "0774 222 2377";

export const INSTAGRAM_URL = "https://www.instagram.com/fzone.iq";
export const INSTAGRAM_HANDLE = "@fzone.iq";

/** Opens a WhatsApp chat with the store, with `text` already typed in. */
export function whatsappLink(text?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
