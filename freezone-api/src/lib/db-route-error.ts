import { isDbConnectionError } from "./prisma";

/** When DATABASE_URL is set but Postgres is down — return 503 instead of 500 + stack in logs */
export function handleRouteDbError(e: unknown): Response {
  if (isDbConnectionError(e)) {
    return Response.json(
      {
        error: "Database unreachable",
        code: "DB_UNREACHABLE",
        hint:
          "PostgreSQL is not accepting connections. Start it (e.g. Docker Desktop, then from the project folder: npm run db:up && npm run db:setup) or set DATABASE_URL to Neon/Supabase.",
      },
      { status: 503 },
    );
  }
  throw e;
}
