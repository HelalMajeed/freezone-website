import { randomBytes, timingSafeEqual } from "node:crypto";

/**
 * In-process service-to-service auth for loop-back calls into admin routes
 * (e.g. the Global Iraq importer invoking `POST /api/admin/products` directly).
 *
 * The token is random per process and never leaves it: loop-back callers build
 * the `Request` themselves and call the route handler function in-process, so
 * an external client can never present a valid value. This replaces the old
 * pattern of minting a legacy `fz_admin_session` cookie, which kept the legacy
 * HMAC cookie load-bearing.
 */
const INTERNAL_ACTOR_HEADER = "x-fz-internal-actor";

const processToken = randomBytes(32).toString("base64url");

/** Headers a loop-back caller attaches to its in-process Request. */
export function internalActorHeaders(label = "importer@internal"): Record<string, string> {
  return { [INTERNAL_ACTOR_HEADER]: `${processToken}:${label}` };
}

/** Returns the actor label (e.g. "importer@internal") when the request carries
 *  a valid per-process internal token; null otherwise. */
export function internalActorFromRequest(req: Request): string | null {
  const raw = req.headers.get(INTERNAL_ACTOR_HEADER);
  if (!raw) return null;
  const sep = raw.indexOf(":");
  if (sep <= 0) return null;
  const token = raw.slice(0, sep);
  const label = raw.slice(sep + 1).trim();
  const a = Buffer.from(token);
  const b = Buffer.from(processToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return label || "internal";
}
