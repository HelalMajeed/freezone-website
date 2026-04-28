/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string | undefined;
  readonly VITE_STATIC_STOREFRONT_ONLY: string | undefined;
  readonly VITE_DATABASE_URL: string | undefined;
  readonly VITE_PUBLIC_SITE_LOGO_URL: string | undefined;
  readonly INTERNAL_API_FETCH_TIMEOUT_MS: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
