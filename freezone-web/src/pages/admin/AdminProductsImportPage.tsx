"use client";

import type { CSSProperties } from "react";
import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

const CSV_TEMPLATE = `sku,nameAr,nameEn,categoryId,brand,price,quantity,descAr
SKU-001,منتج تجريبي,Sample Product,1,Brand,100000,5,وصف عربي
SKU-002,منتج ثانٍ,Second Product,1,Brand,50000,10,وصف`;

type RowResult = { row: number; ok: boolean; error?: string; productId?: number };

type ImportResult = {
  succeeded: number;
  failed: number;
  results: RowResult[];
  batchId?: number;
};

function parsePreviewRows(csv: string): string[][] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  return lines.slice(0, 11).map((line) => line.split(",").map((c) => c.trim()));
}

function downloadTemplate() {
  const bom = "\uFEFF";
  const blob = new Blob([bom + CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "freezone-products-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminProductsImportPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<ImportResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = useMemo(() => parsePreviewRows(csv || CSV_TEMPLATE), [csv]);
  const header = preview[0] ?? [];
  const dataRows = preview.slice(1);
  const errorRows = useMemo(() => {
    const set = new Set<number>();
    lastResult?.results.filter((r) => !r.ok).forEach((r) => set.add(r.row));
    return set;
  }, [lastResult]);

  const onFile = useCallback((file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(String(reader.result ?? ""));
      setStep(2);
      setLastResult(null);
    };
    reader.readAsText(file, "UTF-8");
  }, []);

  async function runImport(dryRun: boolean) {
    const content = csv.trim();
    if (!content) {
      toast.error("ارفع ملف CSV أولاً");
      return;
    }
    setBusy(true);
    setLastResult(null);
    try {
      const res = await fetch(freezoneApiUrl("/api/admin/import/products-csv"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: content, dryRun }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        data?: ImportResult;
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "فشل الاستيراد");
      const d = j.data!;
      setLastResult(d);
      setStep(3);
      toast.success(dryRun ? "اكتملت المعاينة" : `تم استيراد ${d.succeeded} منتج`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاستيراد");
    }
    setBusy(false);
  }

  const okCount = lastResult?.succeeded ?? 0;
  const failCount = lastResult?.failed ?? 0;

  return (
    <div dir="rtl" style={{ width: "100%" }}>
      <AdminPageHeader
        title="استيراد منتجات بالجملة"
        description="حتى 500 صف لكل دفعة — يُنشئ مسودات DRAFT مرتبطة بسجل ImportBatch"
      />

      <ol style={{ display: "flex", gap: 12, flexWrap: "wrap", margin: "0 0 24px", padding: 0, listStyle: "none" }}>
        {[
          { n: 1, label: "تحميل القالب" },
          { n: 2, label: "رفع ملفك" },
          { n: 3, label: "معاينة وتأكيد" },
        ].map((s) => (
          <li
            key={s.n}
            style={{
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${step >= s.n ? "#3b82f6" : "#334155"}`,
              background: step >= s.n ? "rgba(59,130,246,0.12)" : "transparent",
              fontWeight: step === s.n ? 700 : 500,
            }}
          >
            {s.n}. {s.label}
          </li>
        ))}
      </ol>

      {step === 1 ? (
        <section style={panel}>
          <p>الأعمدة: sku, nameAr, nameEn, categoryId, brand, price, quantity (اختياري: descAr, descEn)</p>
          <button type="button" onClick={downloadTemplate} style={btnPrimary}>
            تنزيل قالب CSV (يفتح في Excel)
          </button>
          <button type="button" style={{ ...btnGhost, marginInlineStart: 8 }} onClick={() => setStep(2)}>
            لدي ملف جاهز →
          </button>
        </section>
      ) : null}

      {step >= 2 ? (
        <section style={panel}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              onFile(e.dataTransfer.files[0] ?? null);
            }}
            style={{
              border: `2px dashed ${dragOver ? "#3b82f6" : "#475569"}`,
              borderRadius: 12,
              padding: 32,
              textAlign: "center",
              marginBottom: 16,
              background: dragOver ? "rgba(59,130,246,0.08)" : "var(--admin-surface-inset, #0f172a)",
            }}
          >
            <p style={{ margin: "0 0 12px" }}>اسحب ملف CSV هنا أو</p>
            <button type="button" style={btnPrimary} onClick={() => fileRef.current?.click()}>
              اختيار ملف
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              hidden
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            {fileName ? <p style={{ marginTop: 12, fontSize: 13 }}>الملف: {fileName}</p> : null}
          </div>

          {csv ? (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                <StatCard label="صفوف المعاينة" value={Math.max(0, preview.length - 1)} />
                {lastResult ? (
                  <>
                    <StatCard label="صحيح" value={okCount} tone="ok" />
                    <StatCard label="بأخطاء" value={failCount} tone="err" />
                  </>
                ) : null}
              </div>

              <div style={{ overflowX: "auto", marginBottom: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={th}>#</th>
                      {header.map((h) => (
                        <th key={h} style={th}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataRows.map((row, i) => {
                      const rowNum = i + 2;
                      const bad = errorRows.has(rowNum);
                      return (
                        <tr key={rowNum} style={{ background: bad ? "rgba(248,113,113,0.15)" : undefined }}>
                          <td style={td}>{rowNum}</td>
                          {row.map((cell, j) => (
                            <td key={j} style={td} title={bad && lastResult ? lastResult.results.find((r) => r.row === rowNum)?.error : undefined}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={busy} onClick={() => void runImport(true)} style={btnGhost}>
                  Dry Run — تحقق بدون استيراد
                </button>
                <button type="button" disabled={busy} onClick={() => void runImport(false)} style={btnPrimary}>
                  استيراد الصفوف الصحيحة ({lastResult ? okCount : "شغّل المعاينة أولاً"})
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {lastResult && step === 3 ? (
        <section style={{ ...panel, marginTop: 16 }}>
          <h3 style={{ marginTop: 0 }}>تقرير الاستيراد</h3>
          <p>
            نجح: <strong>{lastResult.succeeded}</strong> · فشل: <strong>{lastResult.failed}</strong>
            {lastResult.batchId != null ? (
              <>
                {" "}
                · دفعة #{lastResult.batchId}
              </>
            ) : null}
          </p>
          {lastResult.failed > 0 ? (
            <pre style={pre}>
              {lastResult.results
                .filter((r) => !r.ok)
                .slice(0, 20)
                .map((r) => `صف ${r.row}: ${r.error}`)
                .join("\n")}
            </pre>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: "ok" | "err" }) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: 8,
        border: "1px solid #334155",
        minWidth: 120,
        background: tone === "ok" ? "rgba(74,222,128,0.1)" : tone === "err" ? "rgba(248,113,113,0.1)" : undefined,
      }}
    >
      <div style={{ fontSize: 12, color: "#94a3b8" }}>{label}</div>
      <strong style={{ fontSize: 20 }}>{value}</strong>
    </div>
  );
}

const panel: CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const btnPrimary: React.CSSProperties = {
  padding: "10px 18px",
  background: "#0b1f3b",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};
const btnGhost: CSSProperties = {
  ...btnPrimary,
  background: "#334155",
};
const th: React.CSSProperties = {
  textAlign: "right",
  padding: "8px 10px",
  borderBottom: "1px solid #334155",
  whiteSpace: "nowrap",
};
const td: CSSProperties = { padding: "8px 10px", borderBottom: "1px solid #1e293b" };
const pre: CSSProperties = {
  marginTop: 12,
  padding: 12,
  background: "#0f172a",
  borderRadius: 8,
  fontSize: 12,
  whiteSpace: "pre-wrap",
};
