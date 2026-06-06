/**
 * Smoke check: filesystem-convention auto-mounting vs the legacy manual
 * route registry that lived in src/server.ts before it was replaced.
 *
 * - Scans src/app/api for route.ts files (same convention as the runtime
 *   scanner in src/lib/route-registry.ts).
 * - Detects exported HTTP methods statically (regex — no env / DB needed).
 * - Compares against LEGACY_ROUTES (frozen copy of every route the manual
 *   registry mounted) and reports both counts plus any missing/new routes.
 *
 * Exits non-zero if any legacy route is NOT covered by auto-mounting.
 *
 * Usage: node scripts/check-route-parity.mjs   (or: npm run routes:check)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_DIR = path.join(__dirname, "..", "src", "app", "api");

/** Every "METHOD path" pair the manual registry in the old src/server.ts mounted. */
const LEGACY_ROUTES = [
  "GET /api/public/site",
  "POST /api/public/orders",
  "POST /api/public/coupon/validate",
  "GET /api/ssr/catalog/products",
  "GET /api/ssr/catalog/facets",
  "GET /api/ssr/catalog/categories",
  "GET /api/ssr/catalog/brands",
  "GET /api/ssr/home-cms",
  "GET /api/ssr/home-sections",
  "GET /api/ssr/theme",
  "GET /api/ssr/storefront-bootstrap",
  "GET /api/ssr/product/:id",
  "POST /api/pc-build",
  "GET /api/admin/login",
  "POST /api/admin/login",
  "POST /api/admin/logout",
  "GET /api/admin/catalog-config",
  "GET /api/admin/dashboard-stats",
  "GET /api/admin/dashboard",
  "GET /api/admin/dashboard/smart",
  "GET /api/admin/search",
  "GET /api/admin/activity-feed",
  "GET /api/admin/inbox",
  "GET /api/admin/products/smart-filters",
  "GET /api/admin/data-quality",
  "GET /api/admin/classification-preview",
  "GET /api/admin/audit-log",
  "GET /api/admin/cms",
  "PUT /api/admin/cms",
  "GET /api/admin/theme",
  "PATCH /api/admin/theme",
  "GET /api/admin/brands",
  "POST /api/admin/brands",
  "PATCH /api/admin/brands/:id",
  "DELETE /api/admin/brands/:id",
  "GET /api/admin/categories",
  "POST /api/admin/categories",
  "PATCH /api/admin/categories/:id",
  "GET /api/admin/categories/:id/attributes",
  "POST /api/admin/categories/:id/apply-template",
  "GET /api/admin/categories/:id/stats",
  "GET /api/admin/products/check-unique",
  "GET /api/admin/products/export",
  "GET /api/admin/review-queue",
  "PATCH /api/admin/review-queue",
  "GET /api/admin/notifications",
  "GET /api/admin/operator-stats",
  "GET /api/admin/category-templates",
  "POST /api/admin/import/products-csv",
  "GET /api/admin/products",
  "POST /api/admin/products",
  "POST /api/admin/products/bulk",
  "POST /api/admin/products/:id/duplicate",
  "GET /api/admin/products/:id/comments",
  "POST /api/admin/products/:id/comments",
  "GET /api/admin/products/:id",
  "PATCH /api/admin/products/:id",
  "DELETE /api/admin/products/:id",
  "POST /api/admin/products/:id/images",
  "GET /api/admin/products/:id/variants",
  "POST /api/admin/products/:id/variants",
  "PUT /api/admin/products/:id/images",
  "PATCH /api/admin/products/:id/images",
  "GET /api/admin/orders",
  "PATCH /api/admin/orders",
  "GET /api/admin/coupons",
  "POST /api/admin/coupons",
  "PATCH /api/admin/coupons/:id",
  "DELETE /api/admin/coupons/:id",
  "GET /api/admin/site-config",
  "PATCH /api/admin/site-config",
  "GET /api/admin/promo-banners",
  "POST /api/admin/promo-banners",
  "PATCH /api/admin/promo-banners/:id",
  "DELETE /api/admin/promo-banners/:id",
  "GET /api/admin/social-links",
  "POST /api/admin/social-links",
  "PATCH /api/admin/social-links/:id",
  "DELETE /api/admin/social-links/:id",
  "GET /api/admin/trust-bar",
  "POST /api/admin/trust-bar",
  "PATCH /api/admin/trust-bar/:id",
  "DELETE /api/admin/trust-bar/:id",
  "GET /api/admin/home-spotlights",
  "POST /api/admin/home-spotlights",
  "PATCH /api/admin/home-spotlights/:id",
  "DELETE /api/admin/home-spotlights/:id",
  "GET /api/admin/hero-slides",
  "POST /api/admin/hero-slides",
  "PATCH /api/admin/hero-slides/:id",
  "DELETE /api/admin/hero-slides/:id",
  "GET /api/admin/showroom-media",
  "POST /api/admin/showroom-media",
  "PATCH /api/admin/showroom-media/:id",
  "DELETE /api/admin/showroom-media/:id",
  "GET /api/admin/ticker",
  "POST /api/admin/ticker",
  "PATCH /api/admin/ticker/:id",
  "DELETE /api/admin/ticker/:id",
  "GET /api/admin/media",
  "POST /api/admin/media",
  "POST /api/admin/media/import-image",
  "DELETE /api/admin/media/:id",
  "PATCH /api/admin/media/:id",
  "PATCH /api/admin/product-images/:id",
  "DELETE /api/admin/product-images/:id",
  "GET /api/admin/cms-page",
  "POST /api/admin/cms-page/sections",
  "PUT /api/admin/cms-page/reorder",
  "POST /api/admin/cms-page/publish",
  "PATCH /api/admin/cms-page/sections/:id",
  "DELETE /api/admin/cms-page/sections/:id",
  "GET /api/admin/audit",
  "GET /api/admin/import/globaliraq/batches",
  "GET /api/admin/import/globaliraq/batches/:id",
  "POST /api/admin/import/globaliraq/run-batch",
  "POST /api/dashboard/auth/login",
  "POST /api/dashboard/auth/direct-login",
  "POST /api/dashboard/auth/dev-login",
  "POST /api/dashboard/auth/logout",
  "GET /api/dashboard/auth/me",
  "POST /api/dashboard/auth/change-password",
  "GET /api/dashboard/users",
  "POST /api/dashboard/users",
  "GET /api/dashboard/users/:id",
  "PATCH /api/dashboard/users/:id",
  "DELETE /api/dashboard/users/:id",
  "GET /api/dashboard/overview",
  "GET /api/dashboard/audit",
  "POST /api/admin/upload",
  "POST /api/admin/upload/product-image",
];

const METHOD_RE = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

function toExpressSegment(folder) {
  const m = /^\[([A-Za-z0-9_]+)\]$/.exec(folder);
  return m ? `:${m[1]}` : folder;
}

function discover(dir, segments, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      discover(path.join(dir, entry.name), [...segments, toExpressSegment(entry.name)], out);
    } else if (entry.isFile() && entry.name === "route.ts") {
      const source = fs.readFileSync(path.join(dir, entry.name), "utf8");
      for (const m of source.matchAll(METHOD_RE)) {
        out.push(`${m[1]} /api/${segments.join("/")}`);
      }
    }
  }
}

const autoMounted = [];
discover(API_DIR, [], autoMounted);

const autoSet = new Set(autoMounted);
const legacySet = new Set(LEGACY_ROUTES);
const missing = LEGACY_ROUTES.filter((r) => !autoSet.has(r));
const added = autoMounted.filter((r) => !legacySet.has(r)).sort();

console.log(`legacy manual registry routes: ${LEGACY_ROUTES.length}`);
console.log(`auto-mounted routes:           ${autoMounted.length}`);
if (added.length > 0) {
  console.log(`newly exposed by convention (route files that existed but were never registered manually):`);
  for (const r of added) console.log(`  + ${r}`);
}
if (missing.length > 0) {
  console.error(`MISSING from auto-mounting (would be a regression):`);
  for (const r of missing) console.error(`  - ${r}`);
  process.exit(1);
}
console.log("OK: every legacy route is covered by auto-mounting.");
