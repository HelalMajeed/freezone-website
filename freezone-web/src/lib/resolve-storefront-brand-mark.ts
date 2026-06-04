import { FREEZONE_Z_LOGO } from "@/lib/brand-assets";

/**
 * Storefront header/footer icon — red Z only (transparent PNG).
 * Full wordmarks from CMS (`logoUrl`) are not used in the navbar; name + tagline are text.
 */
export function resolveStorefrontBrandMarkUrl(_logoUrl?: string | null): string {
  return FREEZONE_Z_LOGO;
}
