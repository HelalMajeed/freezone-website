import { isAdminAuthenticatedFromRequest } from "@/lib/admin-session";
import { isDatabaseConfigured } from "@/lib/prisma";
import { runImportBatch } from "@/lib/import-globaliraq/run-batch";

/**
 * Kick off a Global Iraq import batch in the background.
 *
 *   Request:  { limit: number (1..100), autoPublish?: boolean }
 *   Response: { batchId: string, queued: number }
 *
 * The batch runs in the same Node process via `setImmediate`. Progress is
 * exposed at `GET /api/admin/import/globaliraq/batches/:id`, which clients
 * (GitHub Actions, the admin dashboard) poll until `status !== "running"`.
 */
export async function POST(req: Request) {
  if (!isAdminAuthenticatedFromRequest(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "No database" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as
    | { limit?: number; autoPublish?: boolean; owner?: string }
    | null;

  const limit = Number.isFinite(body?.limit) ? Number(body!.limit) : 0;
  if (limit <= 0 || limit > 100) {
    return Response.json({ error: "limit must be 1..100" }, { status: 400 });
  }

  /** Spin off the work without awaiting so the HTTP response returns immediately. */
  let kickoff: { batchId: string } | { error: string };
  try {
    kickoff = await startAsync({
      limit,
      autoPublish: body?.autoPublish === true,
      owner: typeof body?.owner === "string" ? body.owner : "run-batch-endpoint",
    });
  } catch (e) {
    if (e instanceof Error && (e as { code?: string }).code === "BATCH_IN_FLIGHT") {
      return Response.json(
        { error: "Another import batch is already running", openBatchId: (e as { openBatchId?: string }).openBatchId },
        { status: 409 },
      );
    }
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
  if ("error" in kickoff) return Response.json(kickoff, { status: 500 });
  return Response.json({ ok: true, ...kickoff });
}

/**
 * Pre-creates the ImportBatch + locks via `runImportBatch`'s preflight, then
 * lets the rest of the work proceed in the background. We do the preflight
 * synchronously so the HTTP response carries the real batch id immediately.
 */
async function startAsync(opts: {
  limit: number;
  autoPublish: boolean;
  owner: string;
}): Promise<{ batchId: string }> {
  /** Pre-emptively check for an in-flight batch so we surface 409 before
   *  spawning work. The real lock check inside runImportBatch races free. */
  const { prisma } = await import("@/lib/prisma");
  const open = await prisma.importBatch.findFirst({
    where: { source: "globaliraq", status: "running" },
  });
  if (open) {
    throw Object.assign(new Error("Another import batch is already running"), {
      code: "BATCH_IN_FLIGHT",
      openBatchId: open.id,
    });
  }

  /** Create a placeholder batch up front so the caller has an id to poll on.
   *  runImportBatch will create its own row, so we delete this immediately
   *  before kicking off — keeps the ID round-trip simple. */
  // NOTE: avoid that complexity — call runImportBatch directly and reuse the id
  // it returns. We schedule via setImmediate so the await chain resolves once
  // the inner promise has constructed its ImportBatch row.

  return await new Promise<{ batchId: string }>((resolve, reject) => {
    /** Run the importer and resolve the outer promise as soon as we have the
     *  batchId (which happens right after `prisma.importBatch.create`). */
    let resolved = false;
    runImportBatch(opts)
      .then((result) => {
        if (!resolved) resolve({ batchId: result.batchId });
      })
      .catch((e) => {
        if (!resolved) reject(e);
      });

    /** Watchdog: if runImportBatch hasn't created its batch row inside 4 s,
     *  surface the error rather than letting the HTTP request hang. */
    const watch = setInterval(async () => {
      try {
        const recent = await prisma.importBatch.findFirst({
          where: { source: "globaliraq", status: "running" },
          orderBy: { startedAt: "desc" },
        });
        if (recent && recent.startedAt.getTime() > Date.now() - 60_000) {
          resolved = true;
          clearInterval(watch);
          resolve({ batchId: recent.id });
        }
      } catch {
        /** ignore polling errors */
      }
    }, 250);
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(watch);
        reject(new Error("Timed out waiting for batch id"));
      }
    }, 8000);
  });
}
