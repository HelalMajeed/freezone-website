import { describe, expect, it } from "vitest";
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";
import raw from "./data/catalog.json";
import { prepareCatalog } from "./catalog";
import { buildOrderMessage, checkCustomer, normalizeIraqPhone, orderTotal } from "./order";
import type { CustomerDetails } from "./prefs";

const catalog = prepareCatalog(raw as unknown as Parameters<typeof prepareCatalog>[0]);

/** The Site translator as the pages use it, without React. */
function translator(messages: Record<string, string>) {
  return (key: string, vars: Record<string, unknown> = {}) =>
    (messages[key] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ""));
}

const customer: CustomerDetails = {
  name: " Ahmed Ali ",
  phone: "+964 770 123 4567",
  city: "saladin",
  address: "Tikrit, 40th Street",
  method: "delivery",
};

describe("Iraqi mobile numbers", () => {
  it("accepts the ways people type them and returns 07XXXXXXXXX", () => {
    for (const typed of ["07701234567", "0770 123 4567", "0770-123-4567", "+9647701234567", "009647701234567", "9647701234567", "7701234567", "٠٧٧٠١٢٣٤٥٦٧"]) {
      expect(normalizeIraqPhone(typed), typed).toBe("07701234567");
    }
  });

  it("refuses anything else", () => {
    for (const typed of ["", "0770123456", "077012345678", "06701234567", "+1 415 555 0100", "abc"]) {
      expect(normalizeIraqPhone(typed), typed).toBeNull();
    }
  });
});

describe("order form checks", () => {
  it("passes complete delivery and pickup details", () => {
    expect(checkCustomer(customer)).toEqual({});
    expect(checkCustomer({ ...customer, method: "pickup", city: "", address: "" })).toEqual({});
  });

  it("names each missing field", () => {
    expect(checkCustomer({ name: "", phone: "123", city: "", address: "", method: "delivery" })).toEqual({
      name: "errName",
      phone: "errPhone",
      city: "errCity",
      address: "errAddress",
    });
    expect(checkCustomer({ ...customer, city: "atlantis" }).city).toBe("errCity");
  });

  it("has a message for every error in both languages", () => {
    for (const key of ["errName", "errPhone", "errCity", "errAddress", "errSummary", "errMessage", "errSystems"]) {
      expect((ar.Site as Record<string, string>)[key], key).toBeTruthy();
      expect((en.Site as Record<string, string>)[key], key).toBeTruthy();
    }
  });
});

describe("WhatsApp order message", () => {
  const rows = [
    { p: catalog.byId.get("FZ-001")!, qty: 2 },
    { p: catalog.byId.get("FZ-377")!, qty: 1 },
  ];

  it("lists every product with its code, quantity and line total, then the total", () => {
    const text = buildOrderMessage({ t: translator(en.Site), locale: "en", rows, customer, note: " call first " });
    const total = rows[0].p.price * 2 + rows[1].p.price;
    expect(orderTotal(rows)).toBe(total);
    expect(text).toContain("(FZ-001) × 2");
    expect(text).toContain("(FZ-377) × 1");
    expect(text).toContain(String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    expect(text).toContain("Name: Ahmed Ali");
    expect(text).toContain("Phone: 07701234567");
    expect(text).toContain("Receiving: Delivery — Saladin");
    expect(text).toContain("Address: Tikrit, 40th Street");
    expect(text).toContain("Notes: call first");
  });

  it("says pickup instead of an address, in Arabic too, with no layout marks left in", () => {
    const text = buildOrderMessage({
      t: translator(ar.Site),
      locale: "ar",
      rows,
      customer: { ...customer, method: "pickup" },
    });
    expect(text).toContain("الاستلام: استلام من المعرض");
    expect(text).not.toContain("العنوان:");
    expect(text).not.toMatch(/[⁦-⁩]/);
  });

  it("never mentions a cost price", () => {
    const text = buildOrderMessage({ t: translator(en.Site), locale: "en", rows, customer });
    expect(text.toLowerCase()).not.toContain("cost");
  });
});
