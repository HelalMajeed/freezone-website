export type CsvProductRow = {
  sku: string;
  nameAr: string;
  nameEn: string;
  categoryId: number;
  brand: string;
  price: number;
  quantity: number;
  descAr?: string;
  descEn?: string;
};

/** Minimal RFC4180-style CSV parser (first row = headers). */
export function parseProductsCsv(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      if (cur.trim()) lines.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) lines.push(cur);

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cell = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (q && line[i + 1] === '"') {
          cell += '"';
          i++;
        } else q = !q;
        continue;
      }
      if (c === "," && !q) {
        out.push(cell.trim());
        cell = "";
        continue;
      }
      cell += c;
    }
    out.push(cell.trim());
    return out;
  };

  if (!lines.length) return { headers: [], rows: [] };
  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export function mapCsvRowToProduct(row: Record<string, string>): CsvProductRow | { error: string } {
  const sku = (row.sku ?? row.barcode ?? "").trim() || "—";
  const nameAr = (row.namear ?? row.name_ar ?? row.name ?? "").trim();
  const nameEn = (row.nameen ?? row.name_en ?? nameAr).trim();
  const categoryId = parseInt(row.categoryid ?? row.category_id ?? "", 10);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    return { error: "categoryId مطلوب" };
  }
  if (!nameAr && !nameEn) return { error: "الاسم مطلوب" };
  const price = parseInt(row.price ?? "0", 10) || 0;
  const quantity = parseInt(row.quantity ?? row.stock ?? "0", 10) || 0;
  return {
    sku,
    nameAr: nameAr || nameEn,
    nameEn: nameEn || nameAr,
    categoryId,
    brand: (row.brand ?? "—").trim() || "—",
    price,
    quantity,
    descAr: row.descar ?? row.desc_ar,
    descEn: row.descen ?? row.desc_en,
  };
}
