// Thin observability shim — structured stdout + optional Sentry hand-off.
//
// We don't install `@sentry/node` directly so the deploy works without the DSN
// being configured. As soon as `SENTRY_DSN_API` is set on Fly + `@sentry/node`
// is added to package.json, the dynamic import below picks Sentry up at boot
// and forwards everything captured through this module to it.
//
// Tracking issue: see `assumption` label issues for the secrets/install steps.

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
    const dsn = process.env.SENTRY_DSN_API;
    if (!dsn) return;
    try {
      /** Sentry isn't in package.json yet — see ASSUMPTION issue for the install step.
       *  Cast through `unknown` so tsc doesn't trip on the missing module. */
      // @ts-expect-error optional package, installed in a later sprint
      const mod = (await import("@sentry/node")) as unknown as SentryLike;
      mod.init({
        dsn,
        environment: process.env.NODE_ENV ?? "development",
        tracesSampleRate: 0,
      });
      sentry = mod;
    } catch (e) {
      console.error("[observability] @sentry/node not installed yet:", e instanceof Error ? e.message : e);
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
