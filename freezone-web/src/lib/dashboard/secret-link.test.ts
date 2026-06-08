import { describe, expect, it } from "vitest";
import { readAccessKey, searchWithoutKey } from "./secret-link";

describe("readAccessKey", () => {
  it("returns null when there is no key", () => {
    expect(readAccessKey("")).toBeNull();
    expect(readAccessKey(null)).toBeNull();
    expect(readAccessKey("?foo=bar")).toBeNull();
    expect(readAccessKey("?key=")).toBeNull();
    expect(readAccessKey("?key=%20%20")).toBeNull(); // whitespace only
  });

  it("extracts the key with or without a leading question mark", () => {
    expect(readAccessKey("?key=abc123")).toBe("abc123");
    expect(readAccessKey("key=abc123")).toBe("abc123");
    expect(readAccessKey("?next=/dashboard&key=abc123")).toBe("abc123");
  });

  it("trims surrounding whitespace and url-decodes", () => {
    expect(readAccessKey("?key=%20abc%20")).toBe("abc");
    expect(readAccessKey("?key=a-b_c.d")).toBe("a-b_c.d");
  });
});

describe("searchWithoutKey", () => {
  it("removes only the key param", () => {
    expect(searchWithoutKey("?key=secret")).toBe("");
    expect(searchWithoutKey("?key=secret&next=/dashboard")).toBe("?next=%2Fdashboard");
    expect(searchWithoutKey("?next=/x&key=secret")).toBe("?next=%2Fx");
  });

  it("is a no-op when there is no key", () => {
    expect(searchWithoutKey("")).toBe("");
    expect(searchWithoutKey("?a=1")).toBe("?a=1");
  });
});
