/**
 * Before `npm run dev`: ensure PostgreSQL is reachable for DATABASE_URL (localhost).
 * - Port 5433 (Windows pg-local-cluster): runs pg-local-cluster-start.ps1
 * - Port 5432: docker compose up -d when Docker CLI is available (freezone-web/docker-compose.yml)
 * - Remote hosts (Neon, etc.): no-op
 *
 * Skip with: SKIP_DEV_DATABASE=1
 */
const fs = require("fs");
const net = require("net");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { webRoot, getDatabaseUrl } = require("./load-env-files.cjs");

/** @returns {string | null} */
function getDockerInvocation() {
  try {
    execSync("docker --version", { stdio: "ignore", cwd: webRoot });
    return "docker";
  } catch {
    /* continue */
  }
  if (process.platform !== "win32") return null;
  const pf = process.env.ProgramFiles || "C:\\Program Files";
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(pf, "Docker", "Docker", "resources", "bin", "docker.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "Docker", "Docker", "resources", "bin", "docker.exe"),
    localAppData ? path.join(localAppData, "Programs", "Docker", "Docker", "resources", "bin", "docker.exe") : "",
  ].filter(Boolean);
  for (const exe of candidates) {
    if (fs.existsSync(exe)) return `"${exe}"`;
  }
  return null;
}

/** @returns {{ host: string; port: number } | null} */
function parseLocalPostgresTarget(databaseUrl) {
  if (!databaseUrl) return null;
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname;
    if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") return null;
    const port = u.port ? parseInt(u.port, 10) : 5432;
    if (!Number.isFinite(port)) return null;
    return { host, port };
  } catch {
    return null;
  }
}

function tcpOpen(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(timeoutMs, () => {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
      resolve(false);
    });
  });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForPostgres(host, port, attempts = 45, gapMs = 1000) {
  for (let i = 0; i < attempts; i++) {
    if (await tcpOpen(host, port, 2500)) return true;
    console.log(`[ensure-dev-database] Waiting for ${host}:${port} … (${i + 1}/${attempts})`);
    await sleep(gapMs);
  }
  return false;
}

function startPgLocalClusterWindows() {
  const ps1 = path.join(webRoot, "scripts", "pg-local-cluster-start.ps1");
  const r = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1], {
    cwd: webRoot,
    stdio: "inherit",
    encoding: "utf8",
  });
  return r.status === 0;
}

function startDockerPostgres(docker) {
  try {
    execSync(`${docker} compose up -d`, { cwd: webRoot, stdio: "inherit", shell: true });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  if (process.env.SKIP_DEV_DATABASE === "1" || process.env.SKIP_DEV_DATABASE === "true") {
    console.log("[ensure-dev-database] SKIP_DEV_DATABASE set — skipping.");
    process.exit(0);
  }

  const dbUrl = getDatabaseUrl();
  if (!dbUrl) {
    console.warn("[ensure-dev-database] No DATABASE_URL in env or .env files — start API with care.");
    process.exit(0);
  }

  const target = parseLocalPostgresTarget(dbUrl);
  if (!target) {
    console.log("[ensure-dev-database] DATABASE_URL is not localhost — skipping local DB bootstrap.");
    process.exit(0);
  }

  const { host, port } = target;

  if (await tcpOpen(host, port, 1500)) {
    console.log(`[ensure-dev-database] ${host}:${port} is ready.`);
    process.exit(0);
  }

  console.log(`[ensure-dev-database] Nothing listening on ${host}:${port} — starting local database…`);

  if (process.platform === "win32" && port === 5433) {
    if (!startPgLocalClusterWindows()) {
      console.error(
        "[ensure-dev-database] pg-local-cluster-start failed. Install PostgreSQL 16, ensure freezone-web/.pgdata exists (run once: npm run db:local), or use Docker + DATABASE_URL on port 5432.",
      );
      process.exit(1);
    }
  } else if (port === 5432) {
    const docker = getDockerInvocation();
    if (docker) {
      console.log("[ensure-dev-database] Starting Docker Postgres (docker compose up -d)…");
      if (!startDockerPostgres(docker)) {
        console.error("[ensure-dev-database] docker compose up -d failed.");
        process.exit(1);
      }
    } else {
      console.warn("[ensure-dev-database] Port 5432 not open and Docker not found — waiting for a local PostgreSQL…");
    }
  } else {
    console.warn(
      `[ensure-dev-database] Port ${port} — no auto-start on this platform. Start PostgreSQL manually. Waiting…`,
    );
  }

  const up = await waitForPostgres(host, port, 50, 1000);
  if (!up) {
    console.error(`[ensure-dev-database] Timed out waiting for ${host}:${port}.`);
    process.exit(1);
  }

  console.log(`[ensure-dev-database] Ready — ${host}:${port}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("[ensure-dev-database]", e);
  process.exit(1);
});
