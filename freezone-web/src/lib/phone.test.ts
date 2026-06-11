import { describe, expect, it } from "vitest";
import { isValidIraqiPhone, normalizeIraqiPhone } from "./phone";

describe("normalizeIraqiPhone", () => {
  it("keeps a canonical local number unchanged", () => {
    expect(normalizeIraqiPhone("07712345678")).toBe("07712345678");
  });

  it("strips spaces, dashes and parentheses", () => {
    expect(normalizeIraqiPhone("0771 234-5678")).toBe("07712345678");
    expect(normalizeIraqiPhone("(0771) 234 5678")).toBe("07712345678");
  });

  it("folds +964 / 00964 / 964 prefixes to a leading 0", () => {
    expect(normalizeIraqiPhone("+9647712345678")).toBe("07712345678");
    expect(normalizeIraqiPhone("009647712345678")).toBe("07712345678");
    expect(normalizeIraqiPhone("9647712345678")).toBe("07712345678");
  });

  it("converts Arabic-indic and Persian digits to ASCII", () => {
    expect(normalizeIraqiPhone("٠٧٧١٢٣٤٥٦٧٨")).toBe("07712345678");
    expect(normalizeIraqiPhone("۰۷۷۱۲۳۴۵۶۷۸")).toBe("07712345678");
    expect(normalizeIraqiPhone("+٩٦٤ ٧٧١ ٢٣٤ ٥٦٧٨")).toBe("07712345678");
  });
});

describe("isValidIraqiPhone", () => {
  it("accepts valid Iraqi mobiles in any supported form", () => {
    expect(isValidIraqiPhone("07712345678")).toBe(true);
    expect(isValidIraqiPhone("+964 771 234 5678")).toBe(true);
    expect(isValidIraqiPhone("٠٧٧١٢٣٤٥٦٧٨")).toBe(true);
  });

  it("rejects wrong lengths, prefixes and non-digits", () => {
    expect(isValidIraqiPhone("")).toBe(false);
    expect(isValidIraqiPhone("0771234567")).toBe(false); // 10 digits
    expect(isValidIraqiPhone("077123456789")).toBe(false); // 12 digits
    expect(isValidIraqiPhone("06712345678")).toBe(false); // landline prefix
    expect(isValidIraqiPhone("077a2345678")).toBe(false);
  });
});
