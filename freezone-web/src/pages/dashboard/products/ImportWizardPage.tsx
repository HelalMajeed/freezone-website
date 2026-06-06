/**
 * Products CSV import wizard — 3 steps:
 *   1. upload/paste CSV
 *   2. map columns to product fields + preview + server dry-run validation
 *   3. commit via POST /api/admin/import/products-csv (rows created as DRAFT)
 *
 * The server importer expects canonical headers (sku, name_ar, name_en,
 * category_id, brand, price, quantity, desc_ar, desc_en) — the wizard rebuilds
 * the CSV from the user's mapping so any source layout works.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, FileUp, PartyPopper } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Field,
  Select,
  Table,
  Textarea,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale, type DashboardMessageKey } from "@/lib/dashboard/i18n";
import {
  dashboardApi,
  productsCsvApi,
  type CategoryOption,
  type ProductsCsvImportResult,
} from "@/lib/dashboard/api";
import s from "./import.module.css";

const MAX_ROWS = 500;
const PREVIEW_ROWS = 8;

/** Canonical importer fields → server CSV headers. */
const TARGET_FIELDS = [
  { field: "category_id", labelKey: "import.fieldCategoryId", required: true },
  { field: "name_ar", labelKey: "import.fieldNameAr", required: false },
  { field: "name_en", labelKey: "import.fieldNameEn", required: false },
  { field: "sku", labelKey: "import.fieldSku", required: false },
  { field: "brand", labelKey: "import.fieldBrand", required: false },
  { field: "price", labelKey: "import.fieldPrice", required: false },
  { field: "quantity", labelKey: "import.fieldQuantity", required: false },
  { field: "desc_ar", labelKey: "import.fieldDescAr", required: false },
  { field: "desc_en", labelKey: "import.fieldDescEn", required: false },
] as const satisfies ReadonlyArray<{
  field: string;
  labelKey: DashboardMessageKey;
  required: boolean;
}>;

type TargetField = (typeof TARGET_FIELDS)[number]["field"];

/** Minimal RFC4180-ish parser (mirror of the server's). */
function parseCsv(text: string): { headers: string[]; rows: string[][] } {
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
  return { headers: splitLine(lines[0]), rows: lines.slice(1).map(splitLine) };
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/** Best-effort automatic mapping from the source header names. */
function autoMap(headers: string[]): Record<TargetField, number | -1> {
  const normalized = headers.map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const find = (...names: string[]) => {
    for (const name of names) {
      const idx = normalized.indexOf(name);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  return {
    category_id: find("category_id", "categoryid", "category"),
    name_ar: find("name_ar", "namear", "name"),
    name_en: find("name_en", "nameen"),
    sku: find("sku", "barcode"),
    brand: find("brand"),
    price: find("price"),
    quantity: find("quantity", "stock", "qty"),
    desc_ar: find("desc_ar", "descar", "description_ar"),
    desc_en: find("desc_en", "descen", "description_en"),
  };
}

export function DashboardProductsImportPage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<TargetField, number | -1>>(autoMap([]));
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [dryRunResult, setDryRunResult] = useState<ProductsCsvImportResult | null>(null);
  const [commitResult, setCommitResult] = useState<ProductsCsvImportResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    dashboardApi.get<CategoryOption[]>("/api/admin/categories").then(setCategories).catch(() => {});
  }, []);

  const loadCsvText = (text: string, name: string | null) => {
    setParseError(null);
    setDryRunResult(null);
    setCommitResult(null);
    const parsed = parseCsv(text);
    if (!parsed.headers.length || !parsed.rows.length) {
      setParseError(t(parsed.headers.length ? "import.noRows" : "import.parseFailed"));
      return;
    }
    if (parsed.rows.length > MAX_ROWS) {
      setParseError(t("import.tooManyRows", { max: MAX_ROWS, rows: parsed.rows.length }));
      return;
    }
    setHeaders(parsed.headers);
    setRows(parsed.rows);
    setMapping(autoMap(parsed.headers));
    setFileName(name);
    setStep(2);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    file
      .text()
      .then((text) => loadCsvText(text, file.name))
      .catch(() => setParseError(t("import.parseFailed")));
  };

  /** Rebuild a canonical-header CSV from the user's column mapping. */
  const buildCanonicalCsv = useMemo(() => {
    return () => {
      const fields = TARGET_FIELDS.map((f) => f.field);
      const lines = [fields.join(",")];
      for (const row of rows) {
        lines.push(
          fields
            .map((field) => {
              const idx = mapping[field];
              return csvEscape(idx >= 0 ? (row[idx] ?? "") : "");
            })
            .join(","),
        );
      }
      return lines.join("\n");
    };
  }, [rows, mapping]);

  const mappingValid = (): boolean => {
    if (mapping.category_id < 0) {
      toast.error(t("import.mapMissingCategory"));
      return false;
    }
    if (mapping.name_ar < 0 && mapping.name_en < 0) {
      toast.error(t("import.mapMissingName"));
      return false;
    }
    return true;
  };

  const runDry = async () => {
    if (!mappingValid()) return;
    setRunning(true);
    try {
      const result = await productsCsvApi.import(buildCanonicalCsv(), { dryRun: true });
      setDryRunResult(result);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setRunning(false);
    }
  };

  const commit = async () => {
    if (!mappingValid()) return;
    setRunning(true);
    try {
      const result = await productsCsvApi.import(buildCanonicalCsv(), { dryRun: false });
      setCommitResult(result);
      setStep(3);
    } catch (e) {
      toast.error(formatError(e));
    } finally {
      setRunning(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFileName(null);
    setPasted("");
    setHeaders([]);
    setRows([]);
    setParseError(null);
    setDryRunResult(null);
    setCommitResult(null);
  };

  const sourceOptions = [
    { value: "-1", label: t("import.mapIgnore") },
    ...headers.map((h, i) => ({ value: String(i), label: h || `#${i + 1}` })),
  ];

  const previewColumns = TARGET_FIELDS.filter((f) => mapping[f.field] >= 0);

  const steps = [
    { n: 1 as const, label: t("import.step1") },
    { n: 2 as const, label: t("import.step2") },
    { n: 3 as const, label: t("import.step3") },
  ];

  return (
    <div className={s.page}>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("import.title")}</h1>
          <div className="dashboard-page-subtitle">{t("import.subtitle")}</div>
        </div>
      </div>

      <div className={s.steps}>
        {steps.map(({ n, label }) => (
          <span
            key={n}
            className={`${s.step} ${step === n ? s.stepActive : ""} ${step > n ? s.stepDone : ""}`}
          >
            {step > n && <CheckCircle2 size={14} aria-hidden />}
            {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <Card tight>
          <div className={s.doneCard}>
            <div
              className={`${s.dropZone} ${dragOver ? s.dropZoneActive : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                onFile(e.dataTransfer.files?.[0]);
              }}
            >
              <FileUp size={28} aria-hidden />
              <span>{t("import.dropHint")}</span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className={s.hiddenInput}
                onChange={(e) => onFile(e.target.files?.[0])}
              />
              <Button variant="secondary" type="button" onClick={() => fileRef.current?.click()}>
                {t("import.browse")}
              </Button>
            </div>

            <Field label={t("import.pasteLabel")}>
              <Textarea
                className={s.pasteArea}
                value={pasted}
                dir="ltr"
                spellCheck={false}
                onChange={(e) => setPasted(e.target.value)}
                placeholder="sku,name_ar,name_en,category_id,brand,price,quantity"
              />
            </Field>
            {parseError && <div className={s.errorBox}>{parseError}</div>}
            <Button
              type="button"
              disabled={!pasted.trim()}
              onClick={() => loadCsvText(pasted, null)}
            >
              {t("common.next")}
            </Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <>
          <Card title={t("import.mapTitle")}>
            <div className={s.fileInfo}>
              {t("import.fileLoaded", { name: fileName ?? "CSV", rows: rows.length })}
            </div>
            <p className={s.fileInfo}>{t("import.mapHint")}</p>
            <div className={s.mapGrid}>
              {TARGET_FIELDS.map(({ field, labelKey, required }) => (
                <Field key={field} label={t(labelKey)} required={required}>
                  <Select
                    value={String(mapping[field])}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [field]: parseInt((e.target as HTMLSelectElement).value, 10),
                      }))
                    }
                    options={sourceOptions}
                  />
                </Field>
              ))}
            </div>
          </Card>

          <Card title={t("import.categoryRef")} tight>
            <ul className={s.refList}>
              {categories.map((c) => (
                <li key={c.id}>
                  <code>{c.id}</code> — {lang === "ar" ? c.nameAr || c.nameEn : c.nameEn}
                </li>
              ))}
            </ul>
          </Card>

          <Card title={t("import.previewTitle", { count: Math.min(PREVIEW_ROWS, rows.length) })} tight>
            <div className={s.previewWrap}>
              <Table
                rowKey={(r: { index: number }) => r.index}
                rows={rows.slice(0, PREVIEW_ROWS).map((cells, index) => ({ index, cells }))}
                columns={previewColumns.map(({ field, labelKey }) => ({
                  header: t(labelKey),
                  cell: (r: { index: number; cells: string[] }) => r.cells[mapping[field]] ?? "",
                }))}
              />
            </div>
          </Card>

          {dryRunResult && (
            <Card
              title={t("import.dryRunDone", {
                ok: dryRunResult.succeeded,
                failed: dryRunResult.failed,
              })}
              tight
            >
              <Table
                rowKey={(r) => r.row}
                rows={dryRunResult.results.filter((r) => !r.ok)}
                empty={t("import.okRow")}
                columns={[
                  { header: t("import.rowCol"), width: "80px", mono: true, cell: (r) => r.row },
                  {
                    header: t("import.statusCol"),
                    width: "110px",
                    cell: (r) =>
                      r.ok ? (
                        <Badge tone="success">{t("import.okRow")}</Badge>
                      ) : (
                        <Badge tone="danger">{t("import.failRow")}</Badge>
                      ),
                  },
                  { header: t("import.errorCol"), cell: (r) => r.error ?? "—" },
                ]}
              />
            </Card>
          )}

          <div className={s.footerNav}>
            <Button variant="secondary" type="button" onClick={reset}>
              {t("common.back")}
            </Button>
            <div className={s.footerNavEnd}>
              <Button variant="secondary" type="button" loading={running} onClick={() => void runDry()}>
                {t("import.dryRun")}
              </Button>
              <Button type="button" loading={running} onClick={() => void commit()}>
                {t("import.commit", { count: rows.length })}
              </Button>
            </div>
          </div>
        </>
      )}

      {step === 3 && commitResult && (
        <Card tight>
          <div className={s.doneCard}>
            <PartyPopper size={32} aria-hidden />
            <h2 className={s.summaryRow}>{t("import.doneTitle")}</h2>
            <div className={s.summaryRow}>
              <span className={s.summaryOk}>
                {t("import.doneSummary", {
                  ok: commitResult.succeeded,
                  failed: commitResult.failed,
                })}
              </span>
              <Badge>{t("import.batchRef", { id: commitResult.batchId })}</Badge>
            </div>
            {commitResult.failed > 0 && (
              <Table
                rowKey={(r) => r.row}
                rows={commitResult.results.filter((r) => !r.ok)}
                columns={[
                  { header: t("import.rowCol"), width: "80px", mono: true, cell: (r) => r.row },
                  { header: t("import.errorCol"), cell: (r) => r.error ?? "—" },
                ]}
              />
            )}
            <div className={s.footerNavEnd}>
              <Button variant="secondary" type="button" onClick={reset}>
                {t("import.startOver")}
              </Button>
              <Link to="/dashboard/products">
                <Button type="button">{t("import.goToProducts")}</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export default DashboardProductsImportPage;
