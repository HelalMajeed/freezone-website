/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Freezone Express API origin (no path), e.g. `https://your-api.example.com` — required on Netlify for `/api/admin/*`. */
  readonly VITE_API_URL: string | undefined;
  readonly VITE_COMMERCE_API_BASE_URL: string | undefined;
  readonly VITE_API_BASE_URL: string | undefined;
  readonly VITE_PUBLIC_STOREFRONT_URL: string | undefined;
  readonly VITE_DEV_API_PROXY: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
