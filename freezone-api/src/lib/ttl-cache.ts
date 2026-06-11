/**
 * Tiny in-process cache with single-flight de-duplication and
 * stale-while-revalidate semantics.
 *
 * Why this exists: the storefront loads the WHOLE published catalog on every
 * `storefront-bootstrap` request (getProductsCatalog has no limit). At ~90
 * products that was cheap; past ~1000 products each load is large, and N
 * concurrent requests each building the full object graph in memory pushed the
 * 1 GB API machine into OOM kills (exit 137). This collapses concurrent loads
 * into one (single-flight) and, once warm, serves the cached value instantly
 * while refreshing in the background — so only the very first request pays the
 * full query cost and memory stays bounded.
 *
 * Admin mutations call the returned `invalidate()` so edits are not hidden.
 */
export type TtlCache<T> = {
  get(key: string, loader: () => Promise<T>): Promise<T>;
  invalidate(key?: string): void;
};

export function createTtlCache<T>(ttlMs: number): TtlCache<T> {
  const store = new Map<string, { value: T; expires: number }>();
  const inflight = new Map<string, Promise<T>>();

  function refresh(key: string, loader: () => Promise<T>): Promise<T> {
    const pending = inflight.get(key);
    if (pending) return pending; // single-flight: share one in-progress load
    const p = (async () => {
      try {
        const value = await loader();
        store.set(key, { value, expires: Date.now() + ttlMs });
        return value;
      } finally {
        inflight.delete(key);
      }
    })();
    inflight.set(key, p);
    return p;
  }

  return {
    async get(key, loader) {
      const hit = store.get(key);
      if (hit) {
        // Stale-while-revalidate: serve the cached copy immediately. If it has
        // expired, kick off a background refresh (errors are swallowed so a
        // transient DB blip can't take down a request that already has data).
        if (hit.expires <= Date.now()) {
          void refresh(key, loader).catch(() => {});
        }
        return hit.value;
      }
      // Cold: nothing cached yet — must await the first load.
      return refresh(key, loader);
    },
    invalidate(key) {
      if (key === undefined) {
        store.clear();
      } else {
        store.delete(key);
      }
    },
  };
}
