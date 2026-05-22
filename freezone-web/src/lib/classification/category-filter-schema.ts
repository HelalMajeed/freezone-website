/** Client-side mirror of API preset slugs (preview only; live schema from API). */
export { DEFAULT_FILTER_TO_DISPLAY_KEY, CATEGORY_FILTER_DISPLAY_OVERRIDES } from "./filter-display-link";

export type CategoryFilterSchemaSummary = {
  slug: string;
  filterCount: number;
  displaySpecCount: number;
  linkedPairs: number;
};
