import { defineConfig, devices } from "playwright/test";

/**
 * FreeZone storefront + admin E2E smoke suite.
 *
 * Deliberately SEPARATE from vitest (`vitest.config.ts` only includes
 * `src/**\/*.test.ts`) and from the app build graph (root `tsconfig.json`
 * only includes `src/**` — this directory has its own `tsconfig.json`).
 *
 * There is intentionally NO `webServer` block: the suite needs a seeded
 * database, a running API (:4000) and Vite (:3010) — see e2e/README.md for
 * the exact local setup. Run with `npm run test:e2e`.
 */
export default defineConfig({
  testDir: ".",
  /** Specs share one DB and the API's in-memory per-IP rate limits — keep them serial. */
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: "./test-results",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3010",
    ...devices["Desktop Chrome"],
    screenshot: "only-on-failure",
    trace: "off",
  },
});
