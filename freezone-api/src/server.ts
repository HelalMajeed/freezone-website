import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import "express-async-errors";
import multer from "multer";
import helmet from "helmet";
import { rateLimitCheck, ipKeyFromExpressReq } from "./lib/rate-limit";
import * as adminAudit from "./app/api/admin/audit/route";
import * as adminAuditLog from "./app/api/admin/audit-log/route";
import * as adminBrands from "./app/api/admin/brands/route";
import * as adminBrandsId from "./app/api/admin/brands/[id]/route";
import * as adminCategories from "./app/api/admin/categories/route";
import * as adminCategoriesId from "./app/api/admin/categories/[id]/route";
import * as adminCategoriesAttributes from "./app/api/admin/categories/[id]/attributes/route";
import * as adminCms from "./app/api/admin/cms/route";
import * as adminCmsPage from "./app/api/admin/cms-page/route";
import * as adminCmsPagePublish from "./app/api/admin/cms-page/publish/route";
import * as adminCmsPageReorder from "./app/api/admin/cms-page/reorder/route";
import * as adminCmsPageSections from "./app/api/admin/cms-page/sections/route";
import * as adminCmsPageSectionsId from "./app/api/admin/cms-page/sections/[id]/route";
import * as adminCoupons from "./app/api/admin/coupons/route";
import * as adminCatalogConfig from "./app/api/admin/catalog-config/route";
import * as adminDashboard from "./app/api/admin/dashboard/route";
import * as adminDashboardSmart from "./app/api/admin/dashboard/smart/route";
import * as adminDashboardStats from "./app/api/admin/dashboard-stats/route";
import * as adminSearch from "./app/api/admin/search/route";
import * as adminActivityFeed from "./app/api/admin/activity-feed/route";
import * as adminInbox from "./app/api/admin/inbox/route";
import * as adminDataQuality from "./app/api/admin/data-quality/route";
import * as adminClassificationPreview from "./app/api/admin/classification-preview/route";
import * as adminLogin from "./app/api/admin/login/route";
import * as adminLogout from "./app/api/admin/logout/route";
import * as adminMedia from "./app/api/admin/media/route";
import * as adminMediaId from "./app/api/admin/media/[id]/route";
import * as adminMediaImportImage from "./app/api/admin/media/import-image/route";
import * as adminOrders from "./app/api/admin/orders/route";
import * as adminProductImagesId from "./app/api/admin/product-images/[id]/route";
import * as adminProducts from "./app/api/admin/products/route";
import * as adminProductsId from "./app/api/admin/products/[id]/route";
import * as adminProductsIdImages from "./app/api/admin/products/[id]/images/route";
import * as adminProductsIdVariants from "./app/api/admin/products/[id]/variants/route";
import * as adminProductsBulk from "./app/api/admin/products/bulk/route";
import * as adminProductsExport from "./app/api/admin/products/export/route";
import * as adminProductsIdDuplicate from "./app/api/admin/products/[id]/duplicate/route";
import * as adminProductsIdComments from "./app/api/admin/products/[id]/comments/route";
import * as adminProductsCheckUnique from "./app/api/admin/products/check-unique/route";
import * as adminReviewQueue from "./app/api/admin/review-queue/route";
import * as adminNotifications from "./app/api/admin/notifications/route";
import * as adminOperatorStats from "./app/api/admin/operator-stats/route";
import * as adminCategoryTemplates from "./app/api/admin/category-templates/route";
import * as adminCategoriesApplyTemplate from "./app/api/admin/categories/[id]/apply-template/route";
import * as adminImportProductsCsv from "./app/api/admin/import/products-csv/route";
import * as adminCategoriesStats from "./app/api/admin/categories/[id]/stats/route";
import * as adminProductsSmartFilters from "./app/api/admin/products/smart-filters/route";
import * as adminUploadProductImage from "./app/api/admin/upload/product-image/route";
import * as adminImportGlobaliraqBatches from "./app/api/admin/import/globaliraq/batches/route";
import * as adminImportGlobaliraqBatchesId from "./app/api/admin/import/globaliraq/batches/[id]/route";
import * as adminImportGlobaliraqRunBatch from "./app/api/admin/import/globaliraq/run-batch/route";
import * as adminTheme from "./app/api/admin/theme/route";
import * as adminUpload from "./app/api/admin/upload/route";
import * as dashboardLogin from "./app/api/dashboard/auth/login/route";
import * as dashboardDirectLogin from "./app/api/dashboard/auth/direct-login/route";
import * as dashboardLogout from "./app/api/dashboard/auth/logout/route";
import * as dashboardMe from "./app/api/dashboard/auth/me/route";
import * as dashboardChangePw from "./app/api/dashboard/auth/change-password/route";
import * as dashboardUsers from "./app/api/dashboard/users/route";
import * as dashboardUsersId from "./app/api/dashboard/users/[id]/route";
import * as dashboardOverview from "./app/api/dashboard/overview/route";
import * as dashboardAudit from "./app/api/dashboard/audit/route";
import * as pcBuild from "./app/api/pc-build/route";
import * as publicCouponValidate from "./app/api/public/coupon/validate/route";
import * as publicOrders from "./app/api/public/orders/route";
import * as publicSite from "./app/api/public/site/route";
import * as ssrBrands from "./app/api/ssr/catalog/brands/route";
import * as ssrCategories from "./app/api/ssr/catalog/categories/route";
import * as ssrProducts from "./app/api/ssr/catalog/products/route";
import * as ssrCatalogFacets from "./app/api/ssr/catalog/facets/route";
import * as ssrHomeCms from "./app/api/ssr/home-cms/route";
import * as ssrHomeSections from "./app/api/ssr/home-sections/route";
import * as ssrProductId from "./app/api/ssr/product/[id]/route";
import * as ssrTheme from "./app/api/ssr/theme/route";
import * as ssrStorefrontBootstrap from "./app/api/ssr/storefront-bootstrap/route";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

dotenv.config({ path: [".env.local", ".env"] });

import { assertAdminSecretsConfigured } from "./lib/admin-secrets";
assertAdminSecretsConfigured();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

function webRequestFromExpress(req: express.Request): Request {
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
  const url = `${proto}://${host}${req.originalUrl}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
    else headers.set(k, v);
  }
  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (Buffer.isBuffer(req.body)) {
      init.body = req.body as unknown as BodyInit;
    } else if (req.body !== undefined && typeof req.body === "string") {
      init.body = req.body;
    } else if (req.body !== undefined && typeof req.body === "object") {
      init.body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }
  return new Request(url, init);
}

async function sendWebResponse(expressRes: express.Response, web: Response) {
  expressRes.status(web.status);
  web.headers.forEach((value, key) => {
    expressRes.append(key, value);
  });
  /** Avoid stale catalog / admin lists in browsers and shared caches after PATCH. */
  if (!expressRes.getHeader("cache-control")) {
    expressRes.setHeader("Cache-Control", "no-store, private, max-age=0");
  }
  const buf = Buffer.from(await web.arrayBuffer());
  expressRes.send(buf);
}

function ctxId(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) };
}

/**
 * Parse the `CORS_ORIGINS` env var into the allow-list the `cors` middleware uses.
 * Falls back to the production origins when unset so a fresh deploy is never
 * accidentally wide-open.
 */
function resolveCorsOrigins(): (origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void {
  const raw = process.env.CORS_ORIGINS?.trim();
  const explicit = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [
        "https://freezone-iq.com",
        "https://freezone-website.fly.dev",
        /^https:\/\/[a-z0-9-]+\.netlify\.app$/i.source,
        "http://127.0.0.1:3000",
        "http://localhost:3000",
      ];
  const exact = new Set<string>();
  const patterns: RegExp[] = [];
  for (const entry of explicit) {
    if (entry.startsWith("^") || entry.includes("\\.")) {
      try { patterns.push(new RegExp(entry, "i")); continue; } catch { /* fall through to exact */ }
    }
    exact.add(entry);
  }
  return (origin, cb) => {
    /** Same-origin / server-to-server / curl have no Origin header — allow. */
    if (!origin) return cb(null, true);
    if (exact.has(origin)) return cb(null, true);
    for (const p of patterns) {
      if (p.test(origin)) return cb(null, true);
    }
    cb(null, false);
  };
}

/** Lightweight security headers — no `helmet` dep, just the ones that matter
 *  for an API + SPA shell. CSP lives on the Netlify side (the SPA serves
 *  index.html), so we keep this server-side set conservative. */
function applySecurityHeaders(_req: express.Request, res: express.Response, next: express.NextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "interest-cohort=()");
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
}

interface RateLimitRule { limit: number; windowMs: number; scope: string; }
const RATE_LIMITS: Record<string, RateLimitRule> = {
  "POST /api/public/orders":              { scope: "public/orders",          limit: 5,  windowMs: 60_000 },
  "POST /api/public/coupon/validate":     { scope: "public/coupon-validate", limit: 10, windowMs: 60_000 },
  "POST /api/pc-build":                   { scope: "public/pc-build",        limit: 10, windowMs: 60_000 },
  "POST /api/admin/login":                { scope: "admin/login",            limit: 5,  windowMs: 10 * 60_000 },
  "POST /api/dashboard/auth/login":       { scope: "dashboard/login",        limit: 5,  windowMs: 10 * 60_000 },
};

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const key = `${req.method} ${req.path}`;
  const rule = RATE_LIMITS[key];
  if (!rule) return next();
  const decision = rateLimitCheck(rule.scope, ipKeyFromExpressReq(req), rule.limit, rule.windowMs);
  res.setHeader("X-RateLimit-Limit", String(rule.limit));
  res.setHeader("X-RateLimit-Remaining", String(decision.remaining));
  if (!decision.ok) {
    const retrySec = Math.ceil((decision.retryAfterMs ?? rule.windowMs) / 1000);
    res.setHeader("Retry-After", String(retrySec));
    res.status(429).type("application/json").send(JSON.stringify({
      ok: false,
      error: "Too many requests",
      code: "RATE_LIMITED",
      retryAfterSec: retrySec,
    }));
    return;
  }
  next();
}

async function main() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(applySecurityHeaders);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: resolveCorsOrigins(),
      credentials: true,
    }),
  );
  app.use(cookieParser());
  /** 1 MB is enough for every JSON payload we actually accept; admin upload
   *  uses multipart so the limit there is set in `multer` separately. */
  app.use(express.json({ limit: "1mb" }));
  app.use(rateLimitMiddleware);

  /** Opt-in JSON access logs: set `LOG_HTTP=1` (avoid noisy stdout in production by default). */
  if (process.env.LOG_HTTP === "1") {
    app.use((req, res, next) => {
      const started = Date.now();
      const pathOnly = req.originalUrl.split("?")[0] ?? req.originalUrl;
      res.on("finish", () => {
        const line = {
          ts: new Date().toISOString(),
          method: req.method,
          path: pathOnly,
          status: res.statusCode,
          ms: Date.now() - started,
        };
        console.log(JSON.stringify(line));
      });
      next();
    });
  }

  /** Serve files written by `POST /api/admin/upload` — storefront and admin load `/uploads/...`. */
  app.use(
    "/uploads",
    express.static(path.join(process.cwd(), "public", "uploads"), {
      maxAge: "7d",
      etag: true,
    }),
  );

  app.get("/", (_req, res) => {
    res.type("application/json").send({ ok: true, service: "freezone-api" });
  });

  app.get("/health", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.type("application/json").send({ ok: true, service: "freezone-api", at: new Date().toISOString() });
  });

  app.get("/api/public/site", async (req, res) => {
    await sendWebResponse(res, await publicSite.GET(webRequestFromExpress(req)));
  });
  app.post("/api/public/orders", async (req, res) => {
    await sendWebResponse(res, await publicOrders.POST(webRequestFromExpress(req)));
  });
  app.post("/api/public/coupon/validate", async (req, res) => {
    await sendWebResponse(res, await publicCouponValidate.POST(webRequestFromExpress(req)));
  });

  app.get("/api/ssr/catalog/products", async (req, res) => {
    await sendWebResponse(res, await ssrProducts.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/catalog/facets", async (req, res) => {
    await sendWebResponse(res, await ssrCatalogFacets.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/catalog/categories", async (req, res) => {
    await sendWebResponse(res, await ssrCategories.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/catalog/brands", async (req, res) => {
    await sendWebResponse(res, await ssrBrands.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/home-cms", async (req, res) => {
    await sendWebResponse(res, await ssrHomeCms.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/home-sections", async (req, res) => {
    await sendWebResponse(res, await ssrHomeSections.GET());
  });
  app.get("/api/ssr/theme", async (req, res) => {
    await sendWebResponse(res, await ssrTheme.GET());
  });
  app.get("/api/ssr/storefront-bootstrap", async (req, res) => {
    await sendWebResponse(res, await ssrStorefrontBootstrap.GET(webRequestFromExpress(req)));
  });
  app.get("/api/ssr/product/:id", async (req, res) => {
    await sendWebResponse(res, await ssrProductId.GET(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.post("/api/pc-build", async (req, res) => {
    await sendWebResponse(res, await pcBuild.POST(webRequestFromExpress(req)));
  });

  app.get("/api/admin/login", async (req, res) => {
    await sendWebResponse(res, await adminLogin.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/login", async (req, res) => {
    await sendWebResponse(res, await adminLogin.POST(webRequestFromExpress(req)));
  });
  app.post("/api/admin/logout", async (req, res) => {
    await sendWebResponse(res, await adminLogout.POST(webRequestFromExpress(req)));
  });

  app.get("/api/admin/catalog-config", async (req, res) => {
    await sendWebResponse(res, await adminCatalogConfig.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/dashboard-stats", async (req, res) => {
    await sendWebResponse(res, await adminDashboardStats.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/dashboard", async (req, res) => {
    await sendWebResponse(res, await adminDashboard.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/dashboard/smart", async (req, res) => {
    await sendWebResponse(res, await adminDashboardSmart.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/search", async (req, res) => {
    await sendWebResponse(res, await adminSearch.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/activity-feed", async (req, res) => {
    await sendWebResponse(res, await adminActivityFeed.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/inbox", async (req, res) => {
    await sendWebResponse(res, await adminInbox.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/products/smart-filters", async (req, res) => {
    await sendWebResponse(res, await adminProductsSmartFilters.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/data-quality", async (req, res) => {
    await sendWebResponse(res, await adminDataQuality.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/classification-preview", async (req, res) => {
    await sendWebResponse(res, await adminClassificationPreview.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/audit-log", async (req, res) => {
    await sendWebResponse(res, await adminAuditLog.GET(webRequestFromExpress(req)));
  });

  app.get("/api/admin/cms", async (req, res) => {
    await sendWebResponse(res, await adminCms.GET(webRequestFromExpress(req)));
  });
  app.put("/api/admin/cms", async (req, res) => {
    await sendWebResponse(res, await adminCms.PUT(webRequestFromExpress(req)));
  });
  app.get("/api/admin/theme", async (req, res) => {
    await sendWebResponse(res, await adminTheme.GET(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/theme", async (req, res) => {
    await sendWebResponse(res, await adminTheme.PATCH(webRequestFromExpress(req)));
  });
  app.get("/api/admin/brands", async (req, res) => {
    await sendWebResponse(res, await adminBrands.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/brands", async (req, res) => {
    await sendWebResponse(res, await adminBrands.POST(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/brands/:id", async (req, res) => {
    await sendWebResponse(res, await adminBrandsId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.delete("/api/admin/brands/:id", async (req, res) => {
    await sendWebResponse(res, await adminBrandsId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.get("/api/admin/categories", async (req, res) => {
    await sendWebResponse(res, await adminCategories.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/categories", async (req, res) => {
    await sendWebResponse(res, await adminCategories.POST(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/categories/:id", async (req, res) => {
    await sendWebResponse(res, await adminCategoriesId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.get("/api/admin/categories/:id/attributes", async (req, res) => {
    await sendWebResponse(
      res,
      await adminCategoriesAttributes.GET(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.post("/api/admin/categories/:id/apply-template", async (req, res) => {
    await sendWebResponse(
      res,
      await adminCategoriesApplyTemplate.POST(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.get("/api/admin/categories/:id/stats", async (req, res) => {
    await sendWebResponse(
      res,
      await adminCategoriesStats.GET(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });

  app.get("/api/admin/products/check-unique", async (req, res) => {
    await sendWebResponse(res, await adminProductsCheckUnique.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/products/export", async (req, res) => {
    await sendWebResponse(res, await adminProductsExport.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/review-queue", async (req, res) => {
    await sendWebResponse(res, await adminReviewQueue.GET(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/review-queue", async (req, res) => {
    await sendWebResponse(res, await adminReviewQueue.PATCH(webRequestFromExpress(req)));
  });
  app.get("/api/admin/notifications", async (req, res) => {
    await sendWebResponse(res, await adminNotifications.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/operator-stats", async (req, res) => {
    await sendWebResponse(res, await adminOperatorStats.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/category-templates", async (req, res) => {
    await sendWebResponse(res, await adminCategoryTemplates.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/import/products-csv", async (req, res) => {
    await sendWebResponse(res, await adminImportProductsCsv.POST(webRequestFromExpress(req)));
  });
  app.get("/api/admin/products", async (req, res) => {
    await sendWebResponse(res, await adminProducts.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/products", async (req, res) => {
    await sendWebResponse(res, await adminProducts.POST(webRequestFromExpress(req)));
  });
  app.post("/api/admin/products/bulk", async (req, res) => {
    await sendWebResponse(res, await adminProductsBulk.POST(webRequestFromExpress(req)));
  });
  app.post("/api/admin/products/:id/duplicate", async (req, res) => {
    await sendWebResponse(
      res,
      await adminProductsIdDuplicate.POST(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.get("/api/admin/products/:id/comments", async (req, res) => {
    await sendWebResponse(
      res,
      await adminProductsIdComments.GET(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.post("/api/admin/products/:id/comments", async (req, res) => {
    await sendWebResponse(
      res,
      await adminProductsIdComments.POST(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.get("/api/admin/products/:id", async (req, res) => {
    await sendWebResponse(res, await adminProductsId.GET(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.patch("/api/admin/products/:id", async (req, res) => {
    await sendWebResponse(res, await adminProductsId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.delete("/api/admin/products/:id", async (req, res) => {
    await sendWebResponse(res, await adminProductsId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.post("/api/admin/products/:id/images", async (req, res) => {
    await sendWebResponse(res, await adminProductsIdImages.POST(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.get("/api/admin/products/:id/variants", async (req, res) => {
    await sendWebResponse(res, await adminProductsIdVariants.GET(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.post("/api/admin/products/:id/variants", async (req, res) => {
    await sendWebResponse(res, await adminProductsIdVariants.POST(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.put("/api/admin/products/:id/images", async (req, res) => {
    await sendWebResponse(res, await adminProductsIdImages.PUT(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.patch("/api/admin/products/:id/images", async (req, res) => {
    await sendWebResponse(res, await adminProductsIdImages.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.get("/api/admin/orders", async (req, res) => {
    await sendWebResponse(res, await adminOrders.GET(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/orders", async (req, res) => {
    await sendWebResponse(res, await adminOrders.PATCH(webRequestFromExpress(req)));
  });

  app.get("/api/admin/coupons", async (req, res) => {
    await sendWebResponse(res, await adminCoupons.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/coupons", async (req, res) => {
    await sendWebResponse(res, await adminCoupons.POST(webRequestFromExpress(req)));
  });

  app.get("/api/admin/media", async (req, res) => {
    await sendWebResponse(res, await adminMedia.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/media", async (req, res) => {
    await sendWebResponse(res, await adminMedia.POST(webRequestFromExpress(req)));
  });
  app.post("/api/admin/media/import-image", async (req, res) => {
    await sendWebResponse(res, await adminMediaImportImage.POST(webRequestFromExpress(req)));
  });
  app.delete("/api/admin/media/:id", async (req, res) => {
    await sendWebResponse(res, await adminMediaId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.patch("/api/admin/media/:id", async (req, res) => {
    await sendWebResponse(res, await adminMediaId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.patch("/api/admin/product-images/:id", async (req, res) => {
    await sendWebResponse(res, await adminProductImagesId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.delete("/api/admin/product-images/:id", async (req, res) => {
    await sendWebResponse(res, await adminProductImagesId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.get("/api/admin/cms-page", async (req, res) => {
    await sendWebResponse(res, await adminCmsPage.GET(webRequestFromExpress(req)));
  });
  app.post("/api/admin/cms-page/sections", async (req, res) => {
    await sendWebResponse(res, await adminCmsPageSections.POST(webRequestFromExpress(req)));
  });
  app.put("/api/admin/cms-page/reorder", async (req, res) => {
    await sendWebResponse(res, await adminCmsPageReorder.PUT(webRequestFromExpress(req)));
  });
  app.post("/api/admin/cms-page/publish", async (req, res) => {
    await sendWebResponse(res, await adminCmsPagePublish.POST(webRequestFromExpress(req)));
  });
  app.patch("/api/admin/cms-page/sections/:id", async (req, res) => {
    await sendWebResponse(res, await adminCmsPageSectionsId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.delete("/api/admin/cms-page/sections/:id", async (req, res) => {
    await sendWebResponse(res, await adminCmsPageSectionsId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });

  app.get("/api/admin/audit", async (req, res) => {
    await sendWebResponse(res, await adminAudit.GET(webRequestFromExpress(req)));
  });

  app.get("/api/admin/import/globaliraq/batches", async (req, res) => {
    await sendWebResponse(res, await adminImportGlobaliraqBatches.GET(webRequestFromExpress(req)));
  });
  app.get("/api/admin/import/globaliraq/batches/:id", async (req, res) => {
    await sendWebResponse(
      res,
      await adminImportGlobaliraqBatchesId.GET(webRequestFromExpress(req), ctxId(req.params.id)),
    );
  });
  app.post("/api/admin/import/globaliraq/run-batch", async (req, res) => {
    await sendWebResponse(res, await adminImportGlobaliraqRunBatch.POST(webRequestFromExpress(req)));
  });

  app.post("/api/dashboard/auth/login", async (req, res) => {
    await sendWebResponse(res, await dashboardLogin.POST(webRequestFromExpress(req)));
  });
  app.post("/api/dashboard/auth/direct-login", async (req, res) => {
    await sendWebResponse(res, await dashboardDirectLogin.POST(webRequestFromExpress(req)));
  });
  app.post("/api/dashboard/auth/logout", async (req, res) => {
    await sendWebResponse(res, await dashboardLogout.POST(webRequestFromExpress(req)));
  });
  app.get("/api/dashboard/auth/me", async (req, res) => {
    await sendWebResponse(res, await dashboardMe.GET(webRequestFromExpress(req)));
  });
  app.post("/api/dashboard/auth/change-password", async (req, res) => {
    await sendWebResponse(res, await dashboardChangePw.POST(webRequestFromExpress(req)));
  });
  app.get("/api/dashboard/users", async (req, res) => {
    await sendWebResponse(res, await dashboardUsers.GET(webRequestFromExpress(req)));
  });
  app.post("/api/dashboard/users", async (req, res) => {
    await sendWebResponse(res, await dashboardUsers.POST(webRequestFromExpress(req)));
  });
  app.get("/api/dashboard/users/:id", async (req, res) => {
    await sendWebResponse(res, await dashboardUsersId.GET(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.patch("/api/dashboard/users/:id", async (req, res) => {
    await sendWebResponse(res, await dashboardUsersId.PATCH(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.delete("/api/dashboard/users/:id", async (req, res) => {
    await sendWebResponse(res, await dashboardUsersId.DELETE(webRequestFromExpress(req), ctxId(req.params.id)));
  });
  app.get("/api/dashboard/overview", async (req, res) => {
    await sendWebResponse(res, await dashboardOverview.GET(webRequestFromExpress(req)));
  });
  app.get("/api/dashboard/audit", async (req, res) => {
    await sendWebResponse(res, await dashboardAudit.GET(webRequestFromExpress(req)));
  });

  app.post(
    "/api/admin/upload",
    upload.single("file"),
    async (req, res, next) => {
      try {
        const proto = req.get("x-forwarded-proto") || req.protocol;
        const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
        const url = `${proto}://${host}${req.originalUrl}`;
        const form = new FormData();
        if (req.file) {
          const file = new File([new Uint8Array(req.file.buffer)], req.file.originalname, {
            type: req.file.mimetype || "application/octet-stream",
          });
          form.set("file", file);
        }
        const b = req.body as Record<string, unknown> | undefined;
        if (b && typeof b === "object") {
          for (const [k, v] of Object.entries(b)) {
            if (v != null) form.set(k, String(v));
          }
        }
        /** Must forward Cookie (and other headers) — admin auth reads `fz_admin_session` from Cookie. */
        const headers = new Headers();
        const cookie = req.headers.cookie;
        if (cookie) headers.set("cookie", cookie);
        const webReq = new Request(url, { method: "POST", headers, body: form });
        await sendWebResponse(res, await adminUpload.POST(webReq));
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/admin/upload/product-image",
    upload.single("file"),
    async (req, res, next) => {
      try {
        const proto = req.get("x-forwarded-proto") || req.protocol;
        const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
        const url = `${proto}://${host}${req.originalUrl}`;
        const form = new FormData();
        if (req.file) {
          const file = new File([new Uint8Array(req.file.buffer)], req.file.originalname, {
            type: req.file.mimetype || "application/octet-stream",
          });
          form.set("file", file);
        }
        const headers = new Headers();
        const cookie = req.headers.cookie;
        if (cookie) headers.set("cookie", cookie);
        const webReq = new Request(url, { method: "POST", headers, body: form });
        await sendWebResponse(res, await adminUploadProductImage.POST(webReq));
      } catch (e) {
        next(e);
      }
    },
  );

  app.use((_req, res) => {
    res.status(404).type("application/json").send(JSON.stringify({ ok: false, error: "NOT_FOUND" }));
  });

  app.use(async (err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(413).type("application/json").send(JSON.stringify({ ok: false, error: "FILE_TOO_LARGE" }));
        return;
      }
      res.status(400).type("application/json").send(JSON.stringify({ ok: false, error: err.message }));
      return;
    }
    console.error("[api] Unhandled error:", err);
    const { captureError } = await import("./lib/observability/index.js");
    captureError(err, {
      tags: { source: "express-unhandled" },
      extra: { method: req.method, path: req.originalUrl.split("?")[0] },
    });
    if (res.headersSent) return;
    res.status(500).type("application/json").send(JSON.stringify({ ok: false, error: "INTERNAL_ERROR" }));
  });

  const port = parseInt(process.env.API_PORT || "4000", 10);
  /** 0.0.0.0 = accept connections on every interface (LAN + loopback). Use API_HOST=127.0.0.1 to lock to local only. */
  const listenHost = process.env.API_HOST?.trim() || "0.0.0.0";
  app.listen(port, listenHost, () => {
    console.log(`[api] http://127.0.0.1:${port} (local) — LAN: http://<this-pc-ip>:${port} if firewall allows`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
