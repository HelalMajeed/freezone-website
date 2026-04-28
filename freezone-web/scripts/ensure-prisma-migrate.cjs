/**
 * After Postgres is reachable, apply Prisma migrations so the API can query without P2021/P1001 loops.
 * Skips when: SKIP_PRISMA_MIGRATE=1, or no DATABASE_URL.
 *
 * Fast path: `migrate deploy` is a no-op when already up to date (~sub-second).
 */
const { execSync } = require("child_process");
const { apiRoot, getDatabaseUrl, getMergedEnv } = require("./load-env-files.cjs");

function main() {
  if (process.env.SKIP_PRISMA_MIGRATE === "1" || process.env.SKIP_PRISMA_MIGRATE === "true") {
    console.log("[ensure-prisma-migrate] SKIP_PRISMA_MIGRATE — skipping.");
    process.exit(0);
  }

  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.warn("[ensure-prisma-migrate] No DATABASE_URL — skipping migrate (API may use static mode only).");
    process.exit(0);
  }

  const env = { ...process.env, ...getMergedEnv(), DATABASE_URL: dbUrl };

  console.log("[ensure-prisma-migrate] npx prisma migrate deploy …");
  try {
    execSync("npx prisma migrate deploy", {
      cwd: apiRoot,
      stdio: "inherit",
      env,
      shell: true,
    });
  } catch {
    console.error("[ensure-prisma-migrate] migrate deploy failed. Fix DATABASE_URL or run: npm run db:setup --prefix ../freezone-api");
    process.exit(1);
  }

  console.log("[ensure-prisma-migrate] Migrations applied.");
  process.exit(0);
}

main();
