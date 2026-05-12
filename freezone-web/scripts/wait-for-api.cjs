/**
 * Blocks until freezone-api responds on /health or / with JSON `{ ok:true, service:"freezone-api" }`.
 * Then Vite starts so /api proxy is not raced.
 * Skip: SKIP_WAIT_API=1
 *
 * Uses `http` first (bypasses some corporate-proxy fetch behavior), then `fetch` if present.
 */
const http = require("http");
const net = require("net");
const { getApiPort } = require("./load-env-files.cjs");

const MAX_ATTEMPTS = 180;
const GAP_MS = 400;
const HTTP_MS = 5000;
const FIRST_DELAY_MS = 500;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Undici/global fetch respects HTTP_PROXY; force localhost never proxied */
function forceLocalhostNoProxy() {
  const add = ["127.0.0.1", "localhost", "::1"];
  const cur = String(process.env.NO_PROXY || process.env.no_proxy || "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  process.env.NO_PROXY = Array.from(new Set([...add, ...cur])).join(",");
  process.env.no_proxy = process.env.NO_PROXY;
}

function probeTcp(port) {
  return new Promise((resolve) => {
    const sock = net.createConnection({ port, host: "127.0.0.1", family: 4 }, () => {
      sock.destroy();
      resolve(true);
    });
    sock.on("error", () => resolve(false));
    sock.setTimeout(1500, () => {
      try {
        sock.destroy();
      } catch {
        /* ignore */
      }
      resolve(false);
    });
  });
}

function httpPing(port, path) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        family: 4,
        port,
        path,
        method: "GET",
        headers: { Connection: "close", Accept: "application/json" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            const j = JSON.parse(body);
            const ok =
              res.statusCode != null &&
              res.statusCode >= 200 &&
              res.statusCode < 500 &&
              Boolean(j && j.ok === true && j.service === "freezone-api");
            resolve(ok);
          } catch {
            resolve(false);
          }
        });
      },
    );
    req.on("error", () => resolve(false));
    req.setTimeout(HTTP_MS, () => {
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

async function fetchPing(port, path) {
  if (typeof fetch !== "function") return false;
  const url = `http://127.0.0.1:${port}${path}`;
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), HTTP_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      signal: ac.signal,
      headers: { Accept: "application/json", Connection: "close" },
    });
    clearTimeout(t);
    if (!res.ok) return false;
    const j = await res.json();
    return Boolean(j && j.ok === true && j.service === "freezone-api");
  } catch {
    clearTimeout(t);
    return false;
  }
}

async function pingApi(port) {
  if (await httpPing(port, "/health")) return true;
  if (await httpPing(port, "/")) return true;
  if (await fetchPing(port, "/health")) return true;
  return fetchPing(port, "/");
}

function httpSnapshot(port, path) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        family: 4,
        port,
        path,
        method: "GET",
        headers: { Connection: "close" },
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({ status: res.statusCode, slice: body.slice(0, 220) });
        });
      },
    );
    req.on("error", (e) => resolve({ status: 0, slice: String(e && e.message) }));
    req.setTimeout(HTTP_MS, () => {
      try {
        req.destroy();
      } catch {
        /* ignore */
      }
      resolve({ status: 0, slice: "timeout" });
    });
    req.end();
  });
}

async function main() {
  forceLocalhostNoProxy();

  if (process.env.SKIP_WAIT_API === "1" || process.env.SKIP_WAIT_API === "true") {
    console.log("[wait-for-api] SKIP_WAIT_API — starting Vite immediately.");
    process.exit(0);
  }

  if (process.env.NETLIFY === "true") {
    console.log("[wait-for-api] NETLIFY environment — skipping wait for local API.");
    process.exit(0);
  }

  const port = getApiPort();
  const mode = typeof fetch === "function" ? "http-first+fetch" : "http";
  console.log(`[wait-for-api] v3 · NO_PROXY hardened · ${mode} · http://127.0.0.1:${port}/health`);

  await sleep(FIRST_DELAY_MS);

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    if (await pingApi(port)) {
      console.log("[wait-for-api] API is ready.");
      process.exit(0);
    }
    if (i === 0 || (i + 1) % 10 === 0) {
      process.stdout.write(`[wait-for-api] Still waiting (${i + 1}/${MAX_ATTEMPTS})…\n`);
    }
    await sleep(GAP_MS);
  }

  const open = await probeTcp(port);
  const snap = await httpSnapshot(port, "/health");
  console.error(
    `[wait-for-api] Timed out (~${Math.round((MAX_ATTEMPTS * GAP_MS + FIRST_DELAY_MS) / 1000)}s). ` +
      `port=${port} tcpOpen=${open} GET/health status=${snap.status} body≈ ${JSON.stringify(snap.slice)}. ` +
      `If tcpOpen=true but JSON wrong, something else may be bound to this port.`,
  );
  process.exit(1);
}

main().catch((e) => {
  console.error("[wait-for-api]", e);
  process.exit(1);
});
