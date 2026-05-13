/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  /** Commerce Nest API base including `/v1` (standalone admin / Netlify). */
  readonly VITE_COMMERCE_API_BASE_URL: string | undefined;
  /** Alias for commerce base (includes `/v1`) — used by some deploy scripts. */
  readonly VITE_API_BASE_URL: string | undefined;
  /** Public storefront origin (no path) — admin login “back to site” on standalone admin host. */
  readonly VITE_PUBLIC_STOREFRONT_URL: string | undefined;
  readonly VITE_STATIC_STOREFRONT_ONLY: string | undefined;
  readonly VITE_DATABASE_URL: string | undefined;
  readonly VITE_PUBLIC_SITE_LOGO_URL: string | undefined;
  readonly INTERNAL_API_FETCH_TIMEOUT_MS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
