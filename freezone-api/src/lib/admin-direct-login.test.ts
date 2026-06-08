import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  adminDirectLoginGate,
  isAdminDirectLoginEnabled,
  verifyAdminDirectLinkToken,
} from "./admin-direct-login";

const KEYS = [
  "ADMIN_DIRECT_LOGIN",
  "ADMIN_SKIP_AUTH",
  "ADMIN_DIRECT_LINK_TOKEN",
  "ADMIN_DIRECT_LINK_TOKEN_HASH",
  "ADMIN_DIRECT_LOGIN_PRODUCTION_ACK",
  "NODE_ENV",
];
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

test("feature flag is off unless explicitly enabled", () => {
  set({});
  assert.equal(isAdminDirectLoginEnabled(), false);
  set({ ADMIN_DIRECT_LOGIN: "true" });
  assert.equal(isAdminDirectLoginEnabled(), true);
  set({ ADMIN_SKIP_AUTH: "true" });
  assert.equal(isAdminDirectLoginEnabled(), true);
});

test("gate: disabled when feature flag off", () => {
  set({});
  assert.deepEqual(adminDirectLoginGate(), { ok: false, code: "DIRECT_LOGIN_DISABLED" });
});

test("gate: enabled but no token configured -> fail closed", () => {
  set({ ADMIN_DIRECT_LOGIN: "true" });
  assert.deepEqual(adminDirectLoginGate(), { ok: false, code: "DIRECT_LOGIN_TOKEN_REQUIRED" });
});

test("gate: production without ack -> not acknowledged", () => {
  set({ ADMIN_DIRECT_LOGIN: "true", ADMIN_DIRECT_LINK_TOKEN: "sekret", NODE_ENV: "production" });
  assert.deepEqual(adminDirectLoginGate(), {
    ok: false,
    code: "DIRECT_LOGIN_PRODUCTION_NOT_ACKNOWLEDGED",
  });
});

test("gate: production with ack + token -> ok", () => {
  set({
    ADMIN_DIRECT_LOGIN: "true",
    ADMIN_DIRECT_LINK_TOKEN: "sekret",
    NODE_ENV: "production",
    ADMIN_DIRECT_LOGIN_PRODUCTION_ACK: "true",
  });
  assert.deepEqual(adminDirectLoginGate(), { ok: true });
});

test("gate: non-production with token -> ok (no ack needed)", () => {
  set({ ADMIN_DIRECT_LOGIN: "true", ADMIN_DIRECT_LINK_TOKEN: "sekret", NODE_ENV: "test" });
  assert.deepEqual(adminDirectLoginGate(), { ok: true });
});

test("verify: false when no token configured", () => {
  set({ ADMIN_DIRECT_LOGIN: "true" });
  assert.equal(verifyAdminDirectLinkToken("anything"), false);
});

test("verify: plain token correct / wrong / missing", () => {
  set({ ADMIN_DIRECT_LOGIN: "true", ADMIN_DIRECT_LINK_TOKEN: "correct-horse" });
  assert.equal(verifyAdminDirectLinkToken("correct-horse"), true);
  assert.equal(verifyAdminDirectLinkToken("wrong"), false);
  assert.equal(verifyAdminDirectLinkToken(""), false);
  assert.equal(verifyAdminDirectLinkToken(null), false);
  assert.equal(verifyAdminDirectLinkToken(undefined), false);
});

test("verify: hash form matches the sha256 of the secret", () => {
  const secret = "super-secret-token";
  const hash = createHash("sha256").update(secret).digest("hex");
  set({ ADMIN_DIRECT_LOGIN: "true", ADMIN_DIRECT_LINK_TOKEN_HASH: hash });
  assert.equal(verifyAdminDirectLinkToken(secret), true);
  assert.equal(verifyAdminDirectLinkToken("not-it"), false);
});
