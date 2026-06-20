/**
 * Supplier feed parsing (CSV + JSON) — dependency-free. Maps the FreeZone feed
 * template columns into normalized RawProductRow records.
 */
import type { RawProductRow } from "./types";

/** Minimal RFC-4180-ish CSV parser (handles quoted fields, commas, newlines). */
export function parseCsv(text: string): Record<string, string>[] {
  const s = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ""));
  if (nonEmpty.length === 0) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((cells) => {
    const o: Record<string, string> = {};
    header.forEach((k, idx) => {
      o[k] = (cells[idx] ?? "").trim();
    });
    return o;
  });
}

export function parseProductsJson(text: string): Record<string, unknown>[] {
  const data = JSON.parse(text) as unknown;
  const arr = Array.isArray(data)
    ? data
    : data && typeof data === "object" && Array.isArray((data as { products?: unknown }).products)
      ? (data as { products: unknown[] }).products
      : [];
  return arr.filter((r): r is Record<string, unknown> => !!r && typeof r === "object");
}

function str(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return v == null ? "" : String(v).trim();
}

function numOrNull(rec: Record<string, unknown>, key: string): number | null {
  const v = rec[key];
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function boolOf(rec: Record<string, unknown>, key: string, def: boolean): boolean {
  const v = rec[key];
  if (v == null || v === "") return def;
  if (typeof v === "boolean") return v;
  return /^(1|true|yes|y)$/i.test(String(v).trim());
}

function splitList(value: string): string[] {
  return value
    .split(/[|\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function objToKv(obj: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

function parseKvJson(value: string): Record<string, string> {
  const t = (value || "").trim();
  if (!t) return {};
  try {
    const obj = JSON.parse(t) as unknown;
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
    return objToKv(obj as Record<string, unknown>);
  } catch {
    return {};
  }
}

/** Key/value field that may arrive as a native object (JSON feed) or a JSON string (CSV). */
function kvField(rec: Record<string, unknown>, key: string): Record<string, string> {
  const v = rec[key];
  if (v && typeof v === "object" && !Array.isArray(v)) return objToKv(v as Record<string, unknown>);
  return parseKvJson(str(rec, key));
}

/** List field that may arrive as a native array (JSON feed) or a delimited string (CSV). */
function listField(rec: Record<string, unknown>, key: string): string[] {
  const v = rec[key];
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  return splitList(str(rec, key));
}

/** Map one raw record (CSV row object or JSON object) to a normalized RawProductRow. */
export function mapRecordToRaw(rec: Record<string, unknown>, rowNumber: number): RawProductRow {
  return {
    rowNumber,
    sku: str(rec, "sku"),
    titleEn: str(rec, "title_en"),
    titleAr: str(rec, "title_ar"),
    brand: str(rec, "brand"),
    category: str(rec, "category"),
    subcategory: str(rec, "subcategory"),
    baseCostIqd: numOrNull(rec, "base_cost_iqd"),
    priceIqd: numOrNull(rec, "price_iqd_optional"),
    markupPercent: numOrNull(rec, "markup_percent_optional"),
    oldPriceIqd: numOrNull(rec, "old_price_iqd_optional"),
    stockStatus: str(rec, "stock_status") || "in_stock",
    mainImageUrl: str(rec, "main_image_url"),
    galleryImageUrls: listField(rec, "gallery_image_urls"),
    sourceUrl: str(rec, "source_url"),
    warranty: str(rec, "warranty"),
    shortDescEn: str(rec, "short_description_en"),
    shortDescAr: str(rec, "short_description_ar"),
    specs: kvField(rec, "specs_json"),
    filterFacets: kvField(rec, "filter_facets_json"),
    active: boolOf(rec, "active", false),
    reviewRequired: boolOf(rec, "review_required", false),
  };
}

export function loadFeedRecords(filePath: string, text: string): Record<string, unknown>[] {
  if (/\.json$/i.test(filePath)) return parseProductsJson(text);
  return parseCsv(text);
}
