import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { adminDirectLoginGate, isAdminDirectLoginEnabled } from "./admin-direct-login";

const KEYS = ["ADMIN_DIRECT_LOGIN", "ADMIN_SKIP_AUTH", "NODE_ENV"];
const saved: Record<string, string | undefined> = {};
function set(env: Record<string, string | undefined>) {
  for (const k of KEYS) {
    if (!(k in saved)) saved[k] = process.env[k];
    if (env[k] === undefined) delete process.env[k];
    else process.env[k] = env[k];
  }
}
afterEach(() => {
  for (const k of KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("direct login is off unless explicitly enabled", () => {
  set({});
  assert.equal(isAdminDirectLoginEnabled(), false);
  assert.deepEqual(adminDirectLoginGate(), { ok: false, code: "DIRECT_LOGIN_DISABLED" });
});

test("ADMIN_DIRECT_LOGIN=true enables direct entry (no token needed)", () => {
  set({ ADMIN_DIRECT_LOGIN: "true" });
  assert.equal(isAdminDirectLoginEnabled(), true);
  assert.deepEqual(adminDirectLoginGate(), { ok: true });
});

test("ADMIN_SKIP_AUTH=true also enables it", () => {
  set({ ADMIN_SKIP_AUTH: "true" });
  assert.deepEqual(adminDirectLoginGate(), { ok: true });
});

test("non-production with the flag still works (explicit NODE_ENV)", () => {
  set({ ADMIN_DIRECT_LOGIN: "true", NODE_ENV: "development" });
  assert.equal(isAdminDirectLoginEnabled(), true);
  assert.deepEqual(adminDirectLoginGate(), { ok: true });
});

test("production fails closed even with ADMIN_DIRECT_LOGIN=true", () => {
  set({ ADMIN_DIRECT_LOGIN: "true", NODE_ENV: "production" });
  assert.equal(isAdminDirectLoginEnabled(), false);
  assert.deepEqual(adminDirectLoginGate(), {
    ok: false,
    code: "DIRECT_LOGIN_DISABLED_IN_PRODUCTION",
  });
});

test("production fails closed even with ADMIN_SKIP_AUTH=true", () => {
  set({ ADMIN_SKIP_AUTH: "true", NODE_ENV: "production" });
  assert.equal(isAdminDirectLoginEnabled(), false);
  assert.deepEqual(adminDirectLoginGate(), {
    ok: false,
    code: "DIRECT_LOGIN_DISABLED_IN_PRODUCTION",
  });
});

test("production without flags reports the production-specific code", () => {
  set({ NODE_ENV: "production" });
  assert.deepEqual(adminDirectLoginGate(), {
    ok: false,
    code: "DIRECT_LOGIN_DISABLED_IN_PRODUCTION",
  });
});
