import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  PAYMENT_METHOD_KEYS,
  isPaymentMethodKey,
  isMethodAvailable,
  listPublicPaymentMethods,
  providerForMethod,
} from "./registry";
import { NotConfiguredError, type PaymentOrder } from "./types";

const GATEWAY_ENV_KEYS = [
  "ZAINCASH_MERCHANT_ID",
  "ZAINCASH_SECRET",
  "ZAINCASH_MSISDN",
  "QICARD_MERCHANT_ID",
  "QICARD_API_KEY",
  "FIB_CLIENT_ID",
  "FIB_CLIENT_SECRET",
  "CARD_GATEWAY_KEY",
];

const ORDER: PaymentOrder = { id: 42, orderNumber: "FZ-00042", total: 150000 };

let savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  savedEnv = {};
  for (const k of GATEWAY_ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of GATEWAY_ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

// --- allowlist + key guard ---

test("isPaymentMethodKey accepts exactly the allowlist", () => {
  for (const key of PAYMENT_METHOD_KEYS) assert.equal(isPaymentMethodKey(key), true);
  for (const bad of ["", "paypal", "COD", "cash", null, undefined, 7, {}]) {
    assert.equal(isPaymentMethodKey(bad), false, `expected ${JSON.stringify(bad)} to be rejected`);
  }
});

// --- method → provider routing ---

test("store_pickup settles via the cod provider", () => {
  assert.equal(providerForMethod("store_pickup").key, "cod");
});

test("visa and master both route to the card adapter", () => {
  assert.equal(providerForMethod("visa").key, "card");
  assert.equal(providerForMethod("master").key, "card");
});

test("gateway methods route to their own adapters", () => {
  assert.equal(providerForMethod("zaincash").key, "zaincash");
  assert.equal(providerForMethod("qicard").key, "qicard");
  assert.equal(providerForMethod("fib").key, "fib");
});

// --- availability ---

test("cod and store_pickup are always available", () => {
  assert.equal(isMethodAvailable("cod"), true);
  assert.equal(isMethodAvailable("store_pickup"), true);
});

test("gateway methods are unavailable without env keys", () => {
  for (const m of ["zaincash", "qicard", "fib", "visa", "master"] as const) {
    assert.equal(isMethodAvailable(m), false, `${m} must be unavailable when unconfigured`);
  }
});

test("setting env keys flips availability (read at call time)", () => {
  process.env.ZAINCASH_MERCHANT_ID = "m";
  process.env.ZAINCASH_SECRET = "s";
  process.env.ZAINCASH_MSISDN = "9647700000000";
  assert.equal(isMethodAvailable("zaincash"), true);

  process.env.CARD_GATEWAY_KEY = "k";
  assert.equal(isMethodAvailable("visa"), true);
  assert.equal(isMethodAvailable("master"), true);

  /** Partial config is NOT configured. */
  process.env.QICARD_MERCHANT_ID = "m";
  assert.equal(isMethodAvailable("qicard"), false);
});

// --- NotConfiguredError from every unconfigured gateway operation ---

test("unconfigured gateway adapters throw NotConfiguredError from every operation", async () => {
  for (const m of ["zaincash", "qicard", "fib", "visa", "master"] as const) {
    const p = providerForMethod(m);
    await assert.rejects(p.createPayment(ORDER), NotConfiguredError, `${m} createPayment`);
    await assert.rejects(p.verifyCallback({ orderId: 42 }), NotConfiguredError, `${m} verifyCallback`);
    await assert.rejects(p.refund(ORDER), NotConfiguredError, `${m} refund`);
  }
});

test("configured gateways still refuse to simulate success", async () => {
  process.env.FIB_CLIENT_ID = "id";
  process.env.FIB_CLIENT_SECRET = "secret";
  const p = providerForMethod("fib");
  assert.equal(p.isConfigured(), true);
  await assert.rejects(p.createPayment(ORDER), (e: Error) => {
    assert.notEqual(e.name, "NotConfiguredError");
    assert.match(e.message, /not implemented/);
    return true;
  });
});

// --- cod semantics ---

test("cod createPayment returns the order number as reference", async () => {
  const result = await providerForMethod("cod").createPayment(ORDER);
  assert.deepEqual(result, { reference: "FZ-00042" });
});

test("cod verifyCallback never reports paid and requires orderId", async () => {
  const cod = providerForMethod("cod");
  assert.deepEqual(await cod.verifyCallback({ orderId: 42 }), { orderId: 42, paid: false });
  await assert.rejects(cod.verifyCallback({}), /orderId required/);
  await assert.rejects(cod.verifyCallback(null), /orderId required/);
});

test("cod refund resolves as a manual no-op", async () => {
  await assert.doesNotReject(providerForMethod("cod").refund(ORDER));
});

// --- public projection ---

test("listPublicPaymentMethods exposes bilingual labels and correct flags", () => {
  const methods = listPublicPaymentMethods();
  assert.equal(methods.length, PAYMENT_METHOD_KEYS.length);
  for (const m of methods) {
    assert.ok(m.labelEn.length > 0, `${m.key} labelEn`);
    assert.ok(m.labelAr.length > 0, `${m.key} labelAr`);
    assert.equal(m.comingSoon, !m.enabled);
  }
  const byKey = new Map(methods.map((m) => [m.key, m]));
  assert.equal(byKey.get("cod")?.enabled, true);
  assert.equal(byKey.get("store_pickup")?.enabled, true);
  assert.equal(byKey.get("zaincash")?.enabled, false);
  assert.equal(byKey.get("zaincash")?.comingSoon, true);
});
