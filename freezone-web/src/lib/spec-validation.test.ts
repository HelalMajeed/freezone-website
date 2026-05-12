import { describe, expect, it } from "vitest";
import { facetKeysFromCategoryJson, normalizeSpecsInput, validateSpecsForFacetKeys } from "./spec-validation";

describe("normalizeSpecsInput", () => {
  it("returns empty object for non-objects", () => {
    expect(normalizeSpecsInput(null)).toEqual({});
    expect(normalizeSpecsInput([])).toEqual({});
    expect(normalizeSpecsInput("x")).toEqual({});
  });

  it("trims string values", () => {
    expect(normalizeSpecsInput({ cpu: "  i7  ", ram: "" })).toEqual({ cpu: "i7", ram: "" });
  });
});

describe("validateSpecsForFacetKeys", () => {
  it("passes when no keys required", () => {
    expect(validateSpecsForFacetKeys({}, [])).toEqual({ ok: true });
  });

  it("fails when required keys missing or blank", () => {
    const r = validateSpecsForFacetKeys({ cpu: "x" }, ["cpu", "ram"]);
    expect(r).toEqual({ ok: false, missing: ["ram"] });
  });
});

describe("facetKeysFromCategoryJson", () => {
  it("accepts string array", () => {
    expect(facetKeysFromCategoryJson(["cpu", "ram"])).toEqual(["cpu", "ram"]);
  });
});
