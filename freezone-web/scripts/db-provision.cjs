/**
 * Docker Postgres (if CLI found) -> prisma migrate -> seed.
 * Preflight: for localhost URLs, checks TCP port before calling Prisma (clearer than P1001 spam).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const net = require("net");
const path = require("path");

const root = path.join(__dirname, "..");
const apiRoot = path.join(root, "..", "freezone-api");

/** @returns {string | null} shell fragment: "docker" or quoted path to docker.exe */
function getDockerInvocation() {
  try {
    execSync("docker --version", { stdio: "ignore", cwd: root });
    return "docker";
  } catch {
    /* continue */
  }
  if (process.platform !== "win32") return null;

  const pf = process.env.ProgramFiles || "C:\\Program Files";
  const localAppData = process.env.LOCALAPPDATA || "";
  const candidates = [
    path.join(pf, "Docker", "Docker", "resources", "bin", "docker.exe"),
    path.join(
      process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
      "Docker",
      "Docker",
      "resources",
      "bin",
      "docker.exe",
    ),
    localAppData
      ? path.join(localAppData, "Programs", "Docker", "Docker", "resources", "bin", "docker.exe")
      : "",
  ].filter(Boolean);

  for (const exe of candidates) {
    if (fs.existsSync(exe)) {
      return `"${exe}"`;
    }
  }
  return null;
}

function run(cmd, label, cwd = root) {
  console.log(`[db-provision] ${label}`);
  execSync(cmd, { stdio: "inherit", cwd, shell: true, env: process.env });
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

/** @returns {{ host: string; port: number } | null} */
function parseLocalPostgresTarget(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== "string") return null;
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

/** Wait until port accepts connections (Docker / Postgres slow start). */
async function waitForPostgres(host, port, attempts = 15, gapMs = 2000) {
  for (let i = 0; i < attempts; i++) {
    if (await tcpOpen(host, port, 2500)) return true;
    console.log(`[db-provision] Waiting for ${host}:${port} ... (${i + 1}/${attempts})`);
    await sleep(gapMs);
  }
  return false;
}

function printNoServerListening(host, port) {
  console.error(`\n[db-provision] Nothing is accepting connections on ${host}:${port}.`);
  console.error("Install and start PostgreSQL, or use Docker Desktop, or point DATABASE_URL to Neon/Supabase.\n");
  printP1001Help();
}

function printP1001Help() {
  console.error("[db-provision] Options:\n");
  console.error("  1) Docker Desktop: https://docs.docker.com/desktop/install/windows-install/");
  console.error("     Restart PowerShell after install, then: npm run db:local\n");
  console.error("  2) PostgreSQL for Windows: https://www.postgresql.org/download/windows/");
  console.error("     Create database + user matching DATABASE_URL in .env\n");
  console.error("  3) Neon (free): https://neon.tech — paste connection string as DATABASE_URL in .env");
  console.error("     Then: npm run db:setup\n");
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  const localTarget = parseLocalPostgresTarget(dbUrl);

  const docker = getDockerInvocation();

  if (docker) {
    if (docker !== "docker") {
      console.log("[db-provision] Using docker.exe from a standard install path (not in PATH).");
    }
    run(`${docker} compose up -d`, "docker compose up -d ...");
    if (localTarget) {
      const up = await waitForPostgres(localTarget.host, localTarget.port);
      if (!up) {
        printNoServerListening(localTarget.host, localTarget.port);
        process.exit(1);
      }
    } else {
      await sleep(3000);
    }
  } else {
    console.warn("[db-provision] Docker CLI not found (PATH + common Windows paths).");
    console.warn("[db-provision] Skipping docker compose.\n");

    if (localTarget) {
      const up = await tcpOpen(localTarget.host, localTarget.port);
      if (!up) {
        printNoServerListening(localTarget.host, localTarget.port);
        process.exit(1);
      }
    }
  }

  run("npm run db:migrate:deploy", "npm run db:migrate:deploy ...", apiRoot);
  run("npm run db:seed", "npm run db:seed ...", apiRoot);
  console.log("[db-provision] Done.");
}

main().catch((e) => {
  console.error("[db-provision] Failed:", e.message || e);
  process.exit(1);
});
