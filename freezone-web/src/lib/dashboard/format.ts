/**
 * Shared dashboard formatting helpers (money / dates / percentages).
 *
 * Kept outside `api.ts` (frozen client) — pure presentation utilities used by
 * the operations pages (orders, overview, media, audit).
 */
import type { DashboardLang } from "@/lib/dashboard/i18n";

/** Integer IQD with thousands separators + localized currency suffix. */
export function formatIQD(amount: number, lang: DashboardLang): string {
  const formatted = new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-IQ", {
    maximumFractionDigits: 0,
  }).format(amount);
  return lang === "ar" ? `${formatted} د.ع` : `${formatted} IQD`;
}

/** Plain localized integer. */
export function formatInt(n: number, lang: DashboardLang): string {
  return new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-GB").format(n);
}

/** Short date — e.g. "6 Jun 2026". */
export function formatDate(iso: string, lang: DashboardLang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-IQ" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

/** Date + time — e.g. "6 Jun 2026, 14:05". */
export function formatDateTime(iso: string, lang: DashboardLang): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(lang === "ar" ? "ar-IQ" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** Signed percentage with one decimal — e.g. "+21.1%" / "−4.0%". */
export function formatDeltaPct(pct: number, lang: DashboardLang): string {
  const value = new Intl.NumberFormat(lang === "ar" ? "ar-IQ" : "en-GB", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(Math.abs(pct));
  return `${pct >= 0 ? "+" : "−"}${value}%`;
}

/** File size in B/KB/MB/GB. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

/** `YYYY-MM-DD` for `<input type="date">` and the analytics/orders date params. */
export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today minus `days` (local time), as `YYYY-MM-DD`. */
export function daysAgoInputValue(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateInputValue(d);
}
