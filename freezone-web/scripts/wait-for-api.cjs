/**
 * Blocks until freezone-api accepts HTTP (GET / returns 2xx). Then Vite starts so /api proxy is not raced.
 * Skip: SKIP_WAIT_API=1
 */
const http = require("http");
const { getApiPort } = require("./load-env-files.cjs");

const MAX_ATTEMPTS = 120;
const GAP_MS = 400;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function pingOnce(port) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/",
        method: "GET",
        timeout: 2500,
      },
      (res) => {
        res.resume();
        resolve(res.statusCode >= 200 && res.statusCode < 500);
      },
    );
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      try {
        req.destroy();
      } catch {
        /* ignore */
      }
      resolve(false);
    });
    req.end();
  });
}

async function main() {
  if (process.env.SKIP_WAIT_API === "1" || process.env.SKIP_WAIT_API === "true") {
    console.log("[wait-for-api] SKIP_WAIT_API — starting Vite immediately.");
    process.exit(0);
  }

  /** Netlify previews do not run freezone-api on localhost:4000 beside Vite. */
  if (process.env.NETLIFY === "true") {
    console.log("[wait-for-api] NETLIFY environment — skipping wait for local API.");
    process.exit(0);
  }

  const port = getApiPort();
  const url = `http://127.0.0.1:${port}/`;
  console.log(`[wait-for-api] Waiting for API at ${url} …`);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (await pingOnce(port)) {
      console.log("[wait-for-api] API is ready.");
      process.exit(0);
    }
    if (i === 0 || (i + 1) % 10 === 0) {
      process.stdout.write(`[wait-for-api] Still waiting (${i + 1}/${MAX_ATTEMPTS})…\n`);
    }
    await sleep(GAP_MS);
  }

  console.error(`[wait-for-api] Timed out after ~${Math.round((MAX_ATTEMPTS * GAP_MS) / 1000)}s. Is freezone-api running on port ${port}?`);
  process.exit(1);
}

main().catch((e) => {
  console.error("[wait-for-api]", e);
  process.exit(1);
});
