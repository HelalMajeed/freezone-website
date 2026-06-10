import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";
import { FAQ_ITEMS } from "./faq-content";
import { POLICY_DOCS } from "./policy-content";

/** Flatten nested message objects into dotted key paths. */
function flattenKeys(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") return flattenKeys(value as Record<string, unknown>, path);
    return [path];
  });
}

describe("Phase-2 content message namespaces (content / cart / footer)", () => {
  for (const ns of ["content", "cart", "footer"] as const) {
    it(`"${ns}" exists in both locales with identical key sets`, () => {
      const enNs = (en as Record<string, unknown>)[ns] as Record<string, unknown> | undefined;
      const arNs = (ar as Record<string, unknown>)[ns] as Record<string, unknown> | undefined;
      expect(enNs, `en.json missing "${ns}" namespace`).toBeTruthy();
      expect(arNs, `ar.json missing "${ns}" namespace`).toBeTruthy();
      expect(flattenKeys(arNs!).sort()).toEqual(flattenKeys(enNs!).sort());
    });

    it(`"${ns}" has no empty strings in either locale`, () => {
      for (const messages of [en, ar] as Record<string, unknown>[]) {
        const nsObj = messages[ns] as Record<string, unknown>;
        for (const key of flattenKeys(nsObj)) {
          const value = key
            .split(".")
            .reduce<unknown>((acc, part) => (acc as Record<string, unknown>)[part], nsObj);
          expect(typeof value, `${ns}.${key} should be a string`).toBe("string");
          expect((value as string).trim().length, `${ns}.${key} is empty`).toBeGreaterThan(0);
        }
      }
    });
  }
});

describe("FAQ content", () => {
  it("has at least 10 fully bilingual Q&As with unique ids", () => {
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(FAQ_ITEMS.map((i) => i.id));
    expect(ids.size).toBe(FAQ_ITEMS.length);
    for (const item of FAQ_ITEMS) {
      expect(item.qEn.trim().length, `${item.id}.qEn`).toBeGreaterThan(0);
      expect(item.qAr.trim().length, `${item.id}.qAr`).toBeGreaterThan(0);
      expect(item.aEn.trim().length, `${item.id}.aEn`).toBeGreaterThan(10);
      expect(item.aAr.trim().length, `${item.id}.aAr`).toBeGreaterThan(10);
    }
  });
});

describe("Warranty policy doc", () => {
  it("exists with bilingual sections and inline SEO copy", () => {
    const doc = POLICY_DOCS.warranty;
    expect(doc.kind).toBe("warranty");
    expect(doc.titleEn.trim().length).toBeGreaterThan(0);
    expect(doc.titleAr.trim().length).toBeGreaterThan(0);
    // Added after the original four — carries inline SEO copy instead of Seo.* keys.
    expect(doc.seoKey).toBeUndefined();
    expect(doc.seoDescEn?.trim().length ?? 0).toBeGreaterThan(0);
    expect(doc.seoDescAr?.trim().length ?? 0).toBeGreaterThan(0);
    expect(doc.sections.length).toBeGreaterThanOrEqual(3);
    for (const section of doc.sections) {
      expect(section.titleEn.trim().length).toBeGreaterThan(0);
      expect(section.titleAr.trim().length).toBeGreaterThan(0);
      expect(section.bodyEn.length).toBeGreaterThan(0);
      expect(section.bodyAr.length).toBe(section.bodyEn.length);
    }
  });

  it("original four policy docs keep their Seo.* key wiring", () => {
    for (const kind of ["shipping", "returns", "privacy", "terms"] as const) {
      expect(POLICY_DOCS[kind].seoKey).toBe(kind);
    }
  });
});
