import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAndDoubleWarranty, DEFAULT_WARRANTY } from "./warranty";

test("ضمان سنة وكالة → ضمان سنتين وكالة", () => {
  assert.equal(parseAndDoubleWarranty("ضمان سنة وكالة"), "ضمان سنتين وكالة");
});

test("ضمان سنتين وكالة → ضمان أربع سنوات وكالة", () => {
  assert.equal(parseAndDoubleWarranty("ضمان سنتين وكالة"), "ضمان أربع سنوات وكالة");
});

test("ضمان 3 سنوات → ضمان 6 سنوات", () => {
  assert.equal(parseAndDoubleWarranty("ضمان 3 سنوات"), "ضمان ست سنوات");
});

test("ضمان 6 أشهر → ضمان 12 شهر", () => {
  assert.equal(parseAndDoubleWarranty("ضمان 6 أشهر"), "ضمان 12 شهر");
});

test("ضمان 12 شهر → ضمان 24 شهر", () => {
  assert.equal(parseAndDoubleWarranty("ضمان 12 شهر"), "ضمان 24 شهر");
});

test("كفالة عام → كفالة عامين", () => {
  assert.equal(parseAndDoubleWarranty("كفالة عام"), "كفالة عامين");
});

test("ضمان لمدة عام → ضمان لمدة عامين", () => {
  assert.equal(parseAndDoubleWarranty("ضمان لمدة عام"), "ضمان لمدة عامين");
});

test("1 year warranty → 2 years warranty", () => {
  assert.equal(parseAndDoubleWarranty("1 year warranty"), "2 years warranty");
});

test("warranty: 2 years → warranty: 4 years", () => {
  assert.equal(parseAndDoubleWarranty("warranty: 2 years"), "warranty: 4 years");
});

test("ضمان مدى الحياة → unchanged (lifetime)", () => {
  assert.equal(parseAndDoubleWarranty("ضمان مدى الحياة"), "ضمان مدى الحياة");
});

test("lifetime warranty → unchanged", () => {
  assert.equal(parseAndDoubleWarranty("lifetime warranty"), "lifetime warranty");
});

test("Arabic-Indic digit ٣ سنوات → 6 سنوات", () => {
  assert.equal(parseAndDoubleWarranty("ضمان ٣ سنوات"), "ضمان ست سنوات");
});

test("Arabic-Indic digit ٦ أشهر → 12 شهر", () => {
  assert.equal(parseAndDoubleWarranty("ضمان ٦ أشهر"), "ضمان 12 شهر");
});

test("empty string → default (not doubled)", () => {
  assert.equal(parseAndDoubleWarranty(""), DEFAULT_WARRANTY);
});

test("null → default", () => {
  assert.equal(parseAndDoubleWarranty(null), DEFAULT_WARRANTY);
});

test("whitespace only → default", () => {
  assert.equal(parseAndDoubleWarranty("   "), DEFAULT_WARRANTY);
});

test("custom default honoured", () => {
  assert.equal(parseAndDoubleWarranty(null, "no warranty"), "no warranty");
});

test("English '6 months' → '12 months'", () => {
  assert.equal(parseAndDoubleWarranty("6 months warranty"), "12 months warranty");
});

test("English '1 month' → '2 months'", () => {
  assert.equal(parseAndDoubleWarranty("1 month warranty"), "2 months warranty");
});

test("ضمان أربع سنوات → ضمان ثمان سنوات", () => {
  assert.equal(parseAndDoubleWarranty("ضمان أربع سنوات"), "ضمان ثمان سنوات");
});

test("ثلاث سنوات (no ضمان prefix) → ست سنوات", () => {
  assert.equal(parseAndDoubleWarranty("ثلاث سنوات"), "ست سنوات");
});

test("5 سنوات → عشر سنوات", () => {
  assert.equal(parseAndDoubleWarranty("ضمان 5 سنوات"), "ضمان عشر سنوات");
});

test("unparseable text → returned unchanged", () => {
  assert.equal(parseAndDoubleWarranty("ضمان وكالة معتمد"), "ضمان وكالة معتمد");
});

test("digit years above 10 keep digit form: 8 سنوات → 16 سنة", () => {
  assert.equal(parseAndDoubleWarranty("ضمان 8 سنوات"), "ضمان 16 سنة");
});

test("hyphenated compound: 3-Year Manufacturer Warranty → 6-Year", () => {
  assert.equal(
    parseAndDoubleWarranty("Warranty : 3-Year Manufacturer Warranty"),
    "Warranty : 6-Year Manufacturer Warranty",
  );
});

test("hyphenated lowercase: 1-year → 2-year (compound kept singular)", () => {
  assert.equal(parseAndDoubleWarranty("1-year limited warranty"), "2-year limited warranty");
});

test("spaced form still pluralises: 1 Year → 2 Years (capital preserved)", () => {
  assert.equal(parseAndDoubleWarranty("1 Year Warranty"), "2 Years Warranty");
});
