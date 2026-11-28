import { IRAQ_PROVINCES } from "@/lib/iraq-provinces";
import { formatMoney, plainText, productName, type SiteLocale, type SiteProduct } from "./catalog";
import type { CustomerDetails } from "./prefs";

/**
 * The order is a WhatsApp message the visitor sends to the store — there is no
 * online checkout or payment on this site. This file builds that message and
 * checks the details typed on the order form.
 */

export type OrderRow = { p: SiteProduct; qty: number };

/**
 * An Iraqi mobile number as the store dials it: "07XXXXXXXXX" (11 digits).
 * Accepts what people actually type — spaces, dashes, +964 / 00964 / 964 in
 * front, a missing leading 0, Arabic-Indic digits. Returns null if it is not one.
 */
export function normalizeIraqPhone(raw: string): string | null {
  let d = raw
    .replace(/[٠-٩]/g, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "");
  if (d.startsWith("00964")) d = d.slice(5);
  else if (d.startsWith("964")) d = d.slice(3);
  if (d.length === 10 && d.startsWith("7")) d = `0${d}`;
  return /^07\d{9}$/.test(d) ? d : null;
}

export type OrderErrors = Partial<Record<"name" | "phone" | "city" | "address", string>>;

/** Which fields still need attention; values are message keys (Site.err…). */
export function checkCustomer(c: CustomerDetails): OrderErrors {
  const errors: OrderErrors = {};
  if (c.name.trim().length < 2) errors.name = "errName";
  if (!normalizeIraqPhone(c.phone)) errors.phone = "errPhone";
  if (c.method === "delivery") {
    if (!IRAQ_PROVINCES.some((p) => p.code === c.city)) errors.city = "errCity";
    if (c.address.trim().length < 3) errors.address = "errAddress";
  }
  return errors;
}

export function provinceName(code: string, locale: SiteLocale): string {
  const p = IRAQ_PROVINCES.find((x) => x.code === code);
  return p ? (locale === "ar" ? p.ar : p.en) : "";
}

export function orderTotal(rows: OrderRow[]): number {
  return rows.reduce((sum, r) => sum + r.p.price * r.qty, 0);
}

/** `t` is the Site translator. One product per line, then the total and the customer's details. */
export function buildOrderMessage(opts: {
  t: (key: string, vars?: Record<string, unknown>) => string;
  locale: SiteLocale;
  rows: OrderRow[];
  customer?: CustomerDetails;
  note?: string;
}): string {
  const { t, locale, rows, customer, note } = opts;
  const currency = t("currency");
  const lines = [
    t("waOrderIntro"),
    ...rows.map(
      (r, i) =>
        `${i + 1}. ${plainText(productName(r.p, locale))} (${r.p.id}) × ${r.qty} — ${formatMoney(r.p.price * r.qty)} ${currency}`,
    ),
    t("waTotal", { total: formatMoney(orderTotal(rows)) }),
  ];
  if (customer) {
    lines.push("");
    lines.push(`${t("waName")} ${customer.name.trim()}`);
    lines.push(`${t("waPhone")} ${normalizeIraqPhone(customer.phone) ?? customer.phone.trim()}`);
    if (customer.method === "pickup") {
      lines.push(`${t("waReceive")} ${t("receivePickup")}`);
    } else {
      lines.push(`${t("waReceive")} ${t("receiveDelivery")} — ${provinceName(customer.city, locale)}`);
      lines.push(`${t("waAddress")} ${customer.address.trim()}`);
    }
  }
  const extra = note?.trim();
  if (extra) lines.push(`${t("waNote")} ${extra}`);
  return lines.join("\n");
}
