import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import "express-async-errors";
import multer from "multer";
import helmet from "helmet";
import { rateLimitCheck, ipKeyFromExpressReq } from "./lib/rate-limit";
import { discoverRoutes, HTTP_METHODS, type DiscoveredRoute, type HttpMethod } from "./lib/route-registry";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
process.chdir(path.join(__dirname, ".."));

dotenv.config({ path: [".env.local", ".env"] });

import { assertAdminSecretsConfigured } from "./lib/admin-secrets";
assertAdminSecretsConfigured();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

/** Routes that accept `multipart/form-data` — mounted behind `multer` so the
 *  raw stream is parsed before we rebuild a Web `FormData` for the handler. */
const MULTIPART_ROUTES = new Set(["/api/admin/upload", "/api/admin/upload/product-image"]);

type RouteHandler = (
  req: Request,
  ctx: { params: Promise<Record<string, string>> },
) => Response | Promise<Response>;

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

/** Route ctx in the Next.js shape every handler expects: `{ params: Promise<{...}> }`. */
function routeCtx(req: express.Request): { params: Promise<Record<string, string>> } {
  return { params: Promise.resolve({ ...req.params }) };
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
  "POST /api/public/orders/track":        { scope: "public/order-track",     limit: 10, windowMs: 60_000 },
  "POST /api/public/contact":             { scope: "public/contact",         limit: 5,  windowMs: 60_000 },
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

/** Standard adapter: Express -> Web Request -> handler -> Web Response -> Express. */
function expressHandler(fn: RouteHandler): express.RequestHandler {
  return async (req, res) => {
    await sendWebResponse(res, await fn(webRequestFromExpress(req), routeCtx(req)));
  };
}

/** Multipart adapter: `multer` has already parsed the stream; rebuild a Web
 *  `FormData` (file + text fields) and forward Cookie — admin auth reads
 *  `fz_admin_session` from Cookie. */
function multipartExpressHandler(fn: RouteHandler): express.RequestHandler {
  return async (req, res, next) => {
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
      const headers = new Headers();
      const cookie = req.headers.cookie;
      if (cookie) headers.set("cookie", cookie);
      const webReq = new Request(url, { method: "POST", headers, body: form });
      await sendWebResponse(res, await fn(webReq, routeCtx(req)));
    } catch (e) {
      next(e);
    }
  };
}

type ExpressMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";

/**
 * Filesystem-convention auto-mounting: scan `app/api/**\/route.{ts,js}` next to
 * this file (src/ in dev via tsx, dist/ in production — the build emits each
 * route module as a code-split entry point), derive the Express path from the
 * folder path (`[id]` -> `:id`), and mount every exported HTTP method handler.
 * Routes are sorted so static segments mount before `:param` segments.
 */
async function mountApiRoutes(app: express.Express): Promise<{ files: number; routes: number; mounted: string[] }> {
  const apiDir = path.join(__dirname, "app", "api");
  const discovered: DiscoveredRoute[] = discoverRoutes(apiDir, "/api");
  if (discovered.length === 0) {
    throw new Error(`[api] No route modules found under ${apiDir} — check the build output`);
  }
  const mounted: string[] = [];
  for (const route of discovered) {
    const mod = (await import(pathToFileURL(route.file).href)) as Record<string, unknown>;
    for (const method of HTTP_METHODS) {
      const handler = mod[method];
      if (typeof handler !== "function") continue;
      const fn = handler as RouteHandler;
      const expressMethod = method.toLowerCase() as ExpressMethod;
      if (MULTIPART_ROUTES.has(route.expressPath) && method === ("POST" satisfies HttpMethod)) {
        app.post(route.expressPath, upload.single("file"), multipartExpressHandler(fn));
      } else {
        app[expressMethod](route.expressPath, expressHandler(fn));
      }
      mounted.push(`${method} ${route.expressPath}`);
    }
  }
  return { files: discovered.length, routes: mounted.length, mounted };
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

  const { files, routes } = await mountApiRoutes(app);
  console.log(`[api] auto-mounted ${routes} routes from ${files} route modules`);

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
