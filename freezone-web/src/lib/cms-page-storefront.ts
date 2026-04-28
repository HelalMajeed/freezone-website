import { cache } from "react";
import { isDatabaseConfigured } from "./prisma";

export type StorefrontCmsSection = {
  id: number;
  type: string;
  payload: unknown;
};

/**
 * Published homepage sections — null means use legacy hardcoded layout.
 */
async function getPublishedHomeSectionsUncached(locale: "en" | "ar"): Promise<StorefrontCmsSection[] | null> {
  if (!isDatabaseConfigured()) return null;
  const { fetchStorefrontBootstrap } = await import("./storefront-bootstrap");
  return (await fetchStorefrontBootstrap(locale)).homeSections;
}

export const getPublishedHomeSections = cache(getPublishedHomeSectionsUncached);
