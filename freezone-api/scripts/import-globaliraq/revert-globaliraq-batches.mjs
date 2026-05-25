#!/usr/bin/env node
// Operator-directed cleanup: relabel Global Iraq ImportBatch rows so the import
// dashboard reflects the pre-fix revert. Purely a status relabel — does NOT
// touch any Product or image. Reversible.
//
//   - any 'running' globaliraq batch        -> 'cancelled' (+ finishedAt)
//   - completed / completed_with_errors /
//     halted_consecutive_failures globaliraq -> 'reverted'
//
// Usage on the live machine:
//   node scripts/import-globaliraq/revert-globaliraq-batches.mjs

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
try {
  const cancelled = await prisma.importBatch.updateMany({
    where: { source: "globaliraq", status: "running" },
    data: { status: "cancelled", finishedAt: new Date() },
  });
  const reverted = await prisma.importBatch.updateMany({
    where: {
      source: "globaliraq",
      status: { in: ["completed", "completed_with_errors", "halted_consecutive_failures", "halted"] },
    },
    data: { status: "reverted" },
  });
  console.log(`[revert-batches] cancelled ${cancelled.count} running, reverted ${reverted.count} finished`);
  const remaining = await prisma.importBatch.groupBy({
    by: ["status"],
    where: { source: "globaliraq" },
    _count: { _all: true },
  });
  console.log("[revert-batches] status distribution now:");
  for (const r of remaining) console.log(`  ${r.status}: ${r._count._all}`);
} finally {
  await prisma.$disconnect();
}
