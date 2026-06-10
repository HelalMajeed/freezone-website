import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  CUSTOMER_COOKIE,
  buildCustomerCookieHeader,
  clearCustomerCookieHeader,
  isCustomerLocked,
  publicCustomer,
  readCustomerCookieFromHeader,
} from "./customer-auth";

const SAVED: Record<string, string | undefined> = {
  NODE_ENV: process.env.NODE_ENV,
  CUSTOMER_COOKIE_SAMESITE: process.env.CUSTOMER_COOKIE_SAMESITE,
};
afterEach(() => {
  for (const [k, v] of Object.entries(SAVED)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

test("readCustomerCookieFromHeader extracts the token among other cookies", () => {
  const header = `foo=bar; ${CUSTOMER_COOKIE}=abc123; baz=qux`;
  assert.equal(readCustomerCookieFromHeader(header), "abc123");
});

test("readCustomerCookieFromHeader returns null when absent or header missing", () => {
  assert.equal(readCustomerCookieFromHeader("foo=bar"), null);
  assert.equal(readCustomerCookieFromHeader(null), null);
  assert.equal(readCustomerCookieFromHeader(""), null);
});

test("readCustomerCookieFromHeader decodes URI-encoded tokens", () => {
  const header = `${CUSTOMER_COOKIE}=${encodeURIComponent("a+b/c=")}`;
  assert.equal(readCustomerCookieFromHeader(header), "a+b/c=");
});

test("cookie header is HttpOnly + SameSite=Lax with the requested Max-Age", () => {
  delete process.env.NODE_ENV;
  delete process.env.CUSTOMER_COOKIE_SAMESITE;
  const header = buildCustomerCookieHeader("tok", 60);
  assert.ok(header.startsWith(`${CUSTOMER_COOKIE}=tok`));
  assert.ok(header.includes("HttpOnly"));
  assert.ok(header.includes("SameSite=Lax"));
  assert.ok(header.includes("Max-Age=60"));
  assert.ok(header.includes("Path=/"));
  assert.ok(!header.includes("Secure"), "no Secure outside production");
});

test("cookie header adds Secure in production", () => {
  process.env.NODE_ENV = "production";
  delete process.env.CUSTOMER_COOKIE_SAMESITE;
  assert.ok(buildCustomerCookieHeader("tok", 60).includes("Secure"));
  assert.ok(clearCustomerCookieHeader().includes("Secure"));
});

test("CUSTOMER_COOKIE_SAMESITE=none forces SameSite=None + Secure (split-origin deploys)", () => {
  delete process.env.NODE_ENV;
  process.env.CUSTOMER_COOKIE_SAMESITE = "none";
  const header = buildCustomerCookieHeader("tok", 60);
  assert.ok(header.includes("SameSite=None"));
  assert.ok(header.includes("Secure"), "SameSite=None requires Secure");
  assert.ok(clearCustomerCookieHeader().includes("SameSite=None"));
});

test("clear header expires the cookie immediately", () => {
  delete process.env.NODE_ENV;
  const header = clearCustomerCookieHeader();
  assert.ok(header.startsWith(`${CUSTOMER_COOKIE}=;`));
  assert.ok(header.includes("Max-Age=0"));
});

test("token round-trips through build + read", () => {
  delete process.env.NODE_ENV;
  const token = "x_Y-9/z+=";
  const header = buildCustomerCookieHeader(token, 120);
  const cookiePair = header.split("; ")[0];
  assert.equal(readCustomerCookieFromHeader(cookiePair), token);
});

test("isCustomerLocked is true only for a future lockedUntil", () => {
  assert.equal(isCustomerLocked({ lockedUntil: null }), false);
  assert.equal(isCustomerLocked({ lockedUntil: new Date(Date.now() - 1000) }), false);
  assert.equal(isCustomerLocked({ lockedUntil: new Date(Date.now() + 60_000) }), true);
});

test("publicCustomer exposes only id/name/phone/email", () => {
  const projected = publicCustomer({
    id: 7,
    name: "Ali",
    phone: "07712345678",
    email: null,
    // extra fields a Customer row would carry must not leak
    ...({ passwordHash: "scrypt$…", isBlocked: false, failedLogins: 3 } as object),
  });
  assert.deepEqual(projected, { id: 7, name: "Ali", phone: "07712345678", email: null });
});
