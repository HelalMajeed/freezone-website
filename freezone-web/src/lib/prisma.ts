/** SPA: catalog/site data comes from Express unless static-only mode is enabled. */

export function isDatabaseConfigured(): boolean {
  return import.meta.env.VITE_STATIC_STOREFRONT_ONLY !== "true";
}

export type DatabaseBlockReason = "none" | "static_only" | "no_database_url";

export function getDatabaseBlockReason(): DatabaseBlockReason {
  if (import.meta.env.VITE_STATIC_STOREFRONT_ONLY === "true") return "static_only";
  return "none";
}

export function isDbConnectionError(): boolean {
  return false;
}
