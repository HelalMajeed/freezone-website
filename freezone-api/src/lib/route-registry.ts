import fs from "node:fs";
import path from "node:path";

/**
 * Filesystem-convention route discovery (Next.js style).
 *
 * Every `src/app/api/**\/route.ts` file exports HTTP method handlers
 * (`GET`, `POST`, ...) that take a Web `Request` and return a Web `Response`.
 * The Express mount path is derived from the folder path:
 *
 *   src/app/api/admin/products/route.ts          -> /api/admin/products
 *   src/app/api/admin/products/[id]/route.ts     -> /api/admin/products/:id
 *   src/app/api/admin/products/[id]/images/route.ts -> /api/admin/products/:id/images
 *
 * In dev (`tsx watch src/server.ts`) the scanner finds `route.ts` under `src/`;
 * in production it finds the esbuild-emitted `route.js` files under `dist/`
 * (the build lists `src/app/api/**\/route.ts` as code-split entry points).
 */

export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export interface DiscoveredRoute {
  /** Absolute path to the route module on disk. */
  file: string;
  /** Express-style path, e.g. `/api/admin/products/:id`. */
  expressPath: string;
  /** Path segments after `[param]` -> `:param` conversion (for precedence sorting). */
  segments: string[];
}

const ROUTE_FILENAMES = new Set(["route.ts", "route.js", "route.mjs"]);

/** `[id]` -> `:id`; plain folder names pass through unchanged. */
export function toExpressSegment(folder: string): string {
  const m = /^\[([A-Za-z0-9_]+)\]$/.exec(folder);
  if (m) return `:${m[1]}`;
  if (folder.startsWith("[")) {
    throw new Error(`[route-registry] Unsupported dynamic segment "${folder}" — only [param] folders are supported`);
  }
  return folder;
}

/**
 * Express matches routes in registration order, so static segments must be
 * mounted before parameter segments at the same depth — e.g.
 * `/api/admin/products/check-unique` must beat `/api/admin/products/:id`.
 */
export function compareRoutePrecedence(a: DiscoveredRoute, b: DiscoveredRoute): number {
  const len = Math.max(a.segments.length, b.segments.length);
  for (let i = 0; i < len; i++) {
    const x = a.segments[i];
    const y = b.segments[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xParam = x.startsWith(":");
    const yParam = y.startsWith(":");
    if (xParam !== yParam) return xParam ? 1 : -1;
    const c = x.localeCompare(y);
    if (c !== 0) return c;
  }
  return 0;
}

/**
 * Recursively scan `apiDir` for route modules and derive their Express paths.
 * Returns routes sorted by mount precedence (static before `:param`).
 */
export function discoverRoutes(apiDir: string, basePath = "/api"): DiscoveredRoute[] {
  const found: DiscoveredRoute[] = [];

  const walk = (dir: string, segments: string[]) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), [...segments, toExpressSegment(entry.name)]);
      } else if (entry.isFile() && ROUTE_FILENAMES.has(entry.name)) {
        found.push({
          file: path.join(dir, entry.name),
          expressPath: `${basePath}/${segments.join("/")}`,
          segments,
        });
      }
    }
  };

  walk(apiDir, []);
  found.sort(compareRoutePrecedence);
  return found;
}
