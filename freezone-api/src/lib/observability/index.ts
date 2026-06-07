// Thin observability shim — structured stdout + optional Sentry hand-off.
//
// `@sentry/node` is a dependency (see package.json). When a DSN is configured the
// dynamic import below initializes Sentry once at first capture and forwards
// everything captured through this module to it; without a DSN we only log to
// stdout. The DSN var is `SENTRY_DSN` (canonical, also used by .env.example), with
// `SENTRY_DSN_API` accepted as a fallback alias. This is the single Sentry init
// path for the API.

type Severity = "info" | "warning" | "error" | "fatal";

type SentryLike = {
  init: (opts: { dsn?: string; environment?: string; tracesSampleRate?: number }) => void;
  captureException: (e: unknown, ctx?: { tags?: Record<string, string>; extra?: Record<string, unknown> }) => void;
  captureMessage: (
    msg: string,
    ctx?: { level?: Severity; tags?: Record<string, string>; extra?: Record<string, unknown> },
  ) => void;
};

let sentry: SentryLike | null = null;
let initPromise: Promise<void> | null = null;

async function ensureSentry(): Promise<void> {
  if (sentry || initPromise) return initPromise ?? Promise.resolve();
  initPromise = (async () => {
    const dsn = process.env.SENTRY_DSN ?? process.env.SENTRY_DSN_API;
    if (!dsn) return;
    try {
      const mod = (await import("@sentry/node")) as unknown as SentryLike;
      mod.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0,
      });
      sentry = mod;
    } catch (e) {
      console.error("[observability] Sentry init failed:", e instanceof Error ? e.message : e);
    }
  })();
  return initPromise;
}

export function captureError(
  err: unknown,
  ctx: { tags?: Record<string, string>; extra?: Record<string, unknown> } = {},
): void {
  /** Structured stdout always — even after Sentry is wired up, the on-disk
   *  log is a permanent record. */
  const payload = {
    ts: new Date().toISOString(),
    level: "error",
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    tags: ctx.tags,
    extra: ctx.extra,
  };
  console.error(JSON.stringify(payload));
  /** Fire-and-forget Sentry hand-off — we don't block the caller on the network. */
  void ensureSentry().then(() => sentry?.captureException(err, ctx));
}

export function captureMessage(
  message: string,
  level: Severity = "info",
  ctx: { tags?: Record<string, string>; extra?: Record<string, unknown> } = {},
): void {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    tags: ctx.tags,
    extra: ctx.extra,
  };
  console.log(JSON.stringify(payload));
  void ensureSentry().then(() => sentry?.captureMessage(message, { level, ...ctx }));
}
