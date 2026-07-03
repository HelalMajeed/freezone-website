import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { adminPasswordMatches, getAdminPassword } from "./admin-session";

// Regression guard for SEC-2 (docs/ENTERPRISE_GAP_AUDIT.md): the legacy admin
// password path must FAIL CLOSED — never accept an arbitrary input, and never
// fall back to a well-known default password.
const KEYS = ["ADMIN_REQUIRE_PASSWORD", "ADMIN_PASSWORD"];
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

test("fails closed when a password is not required", () => {
  set({ ADMIN_REQUIRE_PASSWORD: undefined, ADMIN_PASSWORD: undefined });
  assert.equal(adminPasswordMatches("anything"), false);
  assert.equal(adminPasswordMatches(""), false);
});

test("does not accept anything just because a password value exists", () => {
  set({ ADMIN_REQUIRE_PASSWORD: "false", ADMIN_PASSWORD: "supersecretvalue" });
  assert.equal(adminPasswordMatches("supersecretvalue"), false);
});

test("fails closed when required but no password is configured", () => {
  set({ ADMIN_REQUIRE_PASSWORD: "true", ADMIN_PASSWORD: undefined });
  assert.equal(adminPasswordMatches("anything"), false);
  assert.equal(adminPasswordMatches(""), false);
});

test("matches the configured password when required (case-insensitive, existing behavior)", () => {
  set({ ADMIN_REQUIRE_PASSWORD: "true", ADMIN_PASSWORD: "Corr3ct-Horse" });
  assert.equal(adminPasswordMatches("Corr3ct-Horse"), true);
  assert.equal(adminPasswordMatches("corr3ct-horse"), true);
  assert.equal(adminPasswordMatches("wrong"), false);
});

test("getAdminPassword has no insecure default", () => {
  set({ ADMIN_PASSWORD: undefined });
  assert.equal(getAdminPassword(), "");
  set({ ADMIN_PASSWORD: "x" });
  assert.equal(getAdminPassword(), "x");
});
