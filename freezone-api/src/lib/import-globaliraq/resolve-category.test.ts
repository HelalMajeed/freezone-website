// Tests for the deterministic Shopify → FreeZone category matcher.
//
// Run via:  npm run test --prefix freezone-api
// (node --import tsx/esm --test src/**/*.test.ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickCategorySlug } from "./resolve-category";

test("Mechanical Keyboard → accessories", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Mechanical Keyboard", vendor: "Cougar", title: "Cougar Puri TKL Keyboard" }),
    "accessories",
  );
});

test("Intel 10th Gen CPU → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Intel 10th Gen", vendor: "Intel", title: "Intel Core i5-10600KF Processor" }),
    "components",
  );
});

test("Z490 motherboard → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Z490", vendor: "MSI", title: "MSI MEG Z490 ACE motherboard" }),
    "components",
  );
});

test("TRX40 motherboard → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "TRX40", vendor: "ASRock", title: "ASRock TRX40 Taichi" }),
    "components",
  );
});

test("Laptop product_type → laptops", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Laptop", vendor: "ASUS", title: "ASUS ROG Strix G16 gaming laptop" }),
    "laptops",
  );
});

test("Gaming Monitor → monitors (specific over gaming)", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Gaming Monitor", vendor: "LG", title: "LG UltraGear 27 monitor" }),
    "monitors",
  );
});

test("Printer ink cartridge → printers", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Ink Cartridge", vendor: "HP", title: "HP 305 ink cartridge" }),
    "printers",
  );
});

test("UPS → power-solutions", () => {
  assert.equal(
    pickCategorySlug({ product_type: "UPS", vendor: "APC", title: "APC 1000VA UPS battery backup" }),
    "power-solutions",
  );
});

test("CCTV NVR → cctv", () => {
  assert.equal(
    pickCategorySlug({ product_type: "NVR", vendor: "Hikvision", title: "Hikvision 16ch NVR with PoE" }),
    "cctv",
  );
});

test("IP Camera → cctv", () => {
  assert.equal(
    pickCategorySlug({ product_type: "IP Camera", vendor: "Dahua", title: "Dahua 4MP IP camera" }),
    "cctv",
  );
});

test("Smart Bulb → smart-home", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Smart Bulb", vendor: "Philips", title: "Philips Hue smart bulb" }),
    "smart-home",
  );
});

test("Galaxy S phone → phones", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Smartphone", vendor: "Samsung", title: "Samsung Galaxy S24 Ultra" }),
    "phones",
  );
});

test("Gamepad → gaming", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Gamepad", vendor: "Xbox", title: "Xbox Wireless Controller" }),
    "gaming",
  );
});

test("Gaming Chair → gaming", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Gaming Chair", vendor: "Razer", title: "Razer Iskur gaming chair" }),
    "gaming",
  );
});

test("DDR5 RAM → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Memory", vendor: "Corsair", title: "Corsair Vengeance 32GB DDR5 RAM" }),
    "components",
  );
});

test("NVMe SSD → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Storage", vendor: "Samsung", title: "Samsung 980 Pro 1TB NVMe SSD" }),
    "components",
  );
});

test("RTX 4090 → components", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Graphics Card", vendor: "ASUS", title: "ASUS ROG Strix RTX 4090 OC" }),
    "components",
  );
});

test("USB Hub → accessories", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Accessory", vendor: "Anker", title: "Anker 7-in-1 USB hub" }),
    "accessories",
  );
});

test("Empty input → null", () => {
  assert.equal(pickCategorySlug({}), null);
});

test("Totally unknown product → null", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Lawn Mower", vendor: "Bosch", title: "Bosch Rotak Lawn Mower 1800W" }),
    null,
  );
});

test("Phone vs smartphone wording variants both hit phones", () => {
  assert.equal(
    pickCategorySlug({ product_type: "iPhone", vendor: "Apple", title: "iPhone 15 Pro Max" }),
    "phones",
  );
});

test("Antivirus license → software", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Software", vendor: "Kaspersky", title: "Kaspersky antivirus 1 year" }),
    "software",
  );
});

test("Mini PC → computers", () => {
  assert.equal(
    pickCategorySlug({ product_type: "Computer", vendor: "Intel", title: "Intel NUC mini pc" }),
    "computers",
  );
});

test("All-in-one PC → all-in-one", () => {
  assert.equal(
    pickCategorySlug({ product_type: "All-in-One", vendor: "HP", title: "HP All-in-One PC 24-inch" }),
    "all-in-one",
  );
});
