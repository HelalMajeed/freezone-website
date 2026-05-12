/**
 * Fails fast if dev ports are already bound (avoids confusing EADDRINUSE from
 * concurrently after wait-for-api succeeds against an old API instance).
 */
const net = require("net");
const { getApiPort, getViteDevPort } = require("./load-env-files.cjs");

function tryBind(port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once("error", (err) => {
      resolve({ ok: false, code: err && err.code });
    });
    s.listen(port, "0.0.0.0", () => {
      s.close(() => resolve({ ok: true }));
    });
  });
}

async function main() {
  if (process.env.SKIP_CHECK_DEV_PORTS === "1" || process.env.SKIP_CHECK_DEV_PORTS === "true") {
    console.log("[check-dev-ports] SKIP_CHECK_DEV_PORTS — not checking ports.");
    process.exit(0);
  }

  const apiPort = getApiPort();
  const webPort = getViteDevPort();

  const checks = [
    { port: apiPort, label: "freezone-api (API_PORT)" },
    { port: webPort, label: "Vite dev (VITE_DEV_PORT or 3000)" },
  ];

  for (const { port, label } of checks) {
    const r = await tryBind(port);
    if (!r.ok) {
      if (r.code === "EADDRINUSE") {
        console.error(`[check-dev-ports] Port ${port} (${label}) is already in use.`);
        console.error(
          "[check-dev-ports] Stop the other process (close an old terminal running npm run dev), or pick new ports in freezone-web/.env and freezone-api/.env:",
        );
        console.error(`  API_PORT=<free port>   (and match API_INTERNAL_URL)`);
        console.error(`  VITE_DEV_PORT=<free port>   (and match NEXT_PUBLIC_SITE_URL if you use it)`);
        console.error("[check-dev-ports] Windows — find PID:  netstat -ano | findstr :" + port);
        console.error("[check-dev-ports] Then:  taskkill /PID <pid> /F");
        process.exit(1);
      }
    }
  }

  console.log(`[check-dev-ports] Ports ${apiPort} (API) and ${webPort} (Vite) are free.`);
}

main().catch((e) => {
  console.error("[check-dev-ports]", e);
  process.exit(1);
});
