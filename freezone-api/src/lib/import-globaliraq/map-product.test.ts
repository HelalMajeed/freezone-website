import { test } from "node:test";
import assert from "node:assert/strict";
import { shopifyToFreezone, type ShopifyProduct } from "./map-product";

const monitorBody = `<p><strong>Monitor Specification</strong></p>
<ul>
<li>\n<strong>Panel Size:</strong> 27 inches</li>
<li>\n<strong>Curve / Flat:</strong> Flat</li>
<li>\n<strong>Adobe RGB:</strong> 99%</li>
</ul>
<p>This professional monitor is ideal for creators.</p>`;

function base(overrides: Partial<ShopifyProduct> = {}): ShopifyProduct {
  return {
    handle: "test-monitor",
    title: "Test Monitor 27",
    vendor: "ASUS",
    product_type: "Monitor",
    body_html: monitorBody,
    options: [{ name: "Title" }],
    variants: [{ id: 1, sku: "M27", price: "100000", option1: "Default" }],
    images: [{ id: 10, src: "https://cdn.shopify.com/x.jpg", position: 1 }],
    ...overrides,
  };
}

test("issue #2: product oldPrice is null on import", () => {
  const m = shopifyToFreezone(base(), { baseUrl: "https://globaliraq.iq" });
  assert.equal(m.productPayload.oldPrice, null);
});

test("price = sourcePrice x 1.35, sourcePrice retained", () => {
  const m = shopifyToFreezone(base(), { baseUrl: "https://globaliraq.iq" });
  assert.equal(m.productPayload.sourcePrice, 100000);
  assert.equal(m.productPayload.price, 135000);
});

test("issue #3: description excludes the spec <ul> list (prose only)", () => {
  const m = shopifyToFreezone(base(), { baseUrl: "https://globaliraq.iq" });
  const desc = m.productPayload.descEn;
  assert.ok(desc.includes("ideal for creators"), "keeps prose paragraph");
  assert.ok(!/Panel Size/i.test(desc), "drops the spec bullet text");
  assert.ok(!/Adobe RGB/i.test(desc), "drops the spec bullet text");
});

test("specs extracted from <li><strong>Key:</strong> Value</li>", () => {
  const m = shopifyToFreezone(base(), { baseUrl: "https://globaliraq.iq" });
  assert.equal(m.productPayload.specs.panel_size, "27 inches");
  assert.equal(m.productPayload.specs.curve_flat, "Flat");
  assert.equal(m.productPayload.specs.adobe_rgb, "99%");
});

test("specs also extracted from <p><strong>Key:</strong> Value</p>", () => {
  const body = `<p><strong>Socket:</strong> LGA1700</p><p><strong>Cores:</strong> 14</p>`;
  const m = shopifyToFreezone(base({ body_html: body }), { baseUrl: "https://globaliraq.iq" });
  assert.equal(m.productPayload.specs.socket, "LGA1700");
  assert.equal(m.productPayload.specs.cores, "14");
});

test("digit-leading spec key gets k_ prefix (validator-safe)", () => {
  const body = `<ul><li><strong>8th Generation Asetek Pump:</strong> Yes</li></ul>`;
  const m = shopifyToFreezone(base({ body_html: body }), { baseUrl: "https://globaliraq.iq" });
  const keys = Object.keys(m.productPayload.specs);
  assert.ok(keys.includes("k_8th_generation_asetek_pump"), `got keys: ${keys.join(",")}`);
  assert.ok(!keys.some((k) => /^[0-9]/.test(k)), "no key starts with a digit");
});

test("warranty present + brand_source snake_case", () => {
  const m = shopifyToFreezone(base(), { baseUrl: "https://globaliraq.iq" });
  assert.ok(m.productPayload.warranty && m.productPayload.warranty.length > 0);
  assert.equal(m.productPayload.specs.brand_source, "ASUS");
});

test("missing price flagged + price 0", () => {
  const m = shopifyToFreezone(base({ variants: [{ id: 2, sku: "X", price: undefined }] }), {
    baseUrl: "https://globaliraq.iq",
  });
  assert.equal(m.flags.missingPrice, true);
  assert.equal(m.productPayload.sourcePrice, null);
});
