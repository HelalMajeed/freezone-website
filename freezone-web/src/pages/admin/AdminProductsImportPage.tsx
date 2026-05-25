"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

const CSV_TEMPLATE = `sku,nameAr,nameEn,categoryId,brand,price,quantity,descAr
SKU-001,منتج تجريبي,Sample Product,1,Brand,100000,5,وصف عربي`;

export default function AdminProductsImportPage() {
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState<string>("");

  async function runImport(dryRun: boolean) {
    setBusy(true);
    setLastResult("");
    try {
      const res = await fetch(freezoneApiUrl("/api/admin/import/products-csv"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csv.trim() || CSV_TEMPLATE, dryRun }),
      });
      const j = (await res.json()) as {
        ok?: boolean;
        data?: { succeeded: number; failed: number; results: Array<{ row: number; ok: boolean; error?: string }> };
        error?: string;
      };
      if (!res.ok) throw new Error(j.error ?? "import failed");
      const d = j.data!;
      const summary = dryRun
        ? `معاينة: نجح ${d.succeeded} · فشل ${d.failed}`
        : `استيراد: نجح ${d.succeeded} · فشل ${d.failed}`;
      setLastResult(
        summary +
          "\n" +
          (d.results
            .filter((r) => !r.ok)
            .slice(0, 10)
            .map((r) => `صف ${r.row}: ${r.error}`)
            .join("\n") || ""),
      );
      toast.success(dryRun ? "اكتملت المعاينة" : "اكتمل الاستيراد");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "فشل الاستيراد");
    }
    setBusy(false);
  }

  return (
    <div dir="rtl">
      <AdminPageHeader
        title="استيراد منتجات CSV"
        description="حتى 500 صف لكل دفعة — يُنشئ مسودات DRAFT مرتبطة بـ ImportBatch"
      />
      <p style={{ fontSize: 14, color: "#94a3b8" }}>
        الأعمدة المطلوبة: sku, nameAr, nameEn, categoryId, brand, price, quantity (اختياري: descAr, descEn)
      </p>
      <button type="button" style={{ marginBottom: 8 }} onClick={() => setCsv(CSV_TEMPLATE)}>
        تحميل قالب
      </button>
      <textarea
        value={csv}
        onChange={(e) => setCsv(e.target.value)}
        rows={14}
        dir="ltr"
        style={{
          width: "100%",
          fontFamily: "ui-monospace, monospace",
          fontSize: 12,
          borderRadius: 8,
          border: "1px solid #334155",
          padding: 12,
        }}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button type="button" disabled={busy} onClick={() => void runImport(true)}>
          معاينة (dry-run)
        </button>
        <button type="button" disabled={busy} onClick={() => void runImport(false)}>
          استيراد فعلي
        </button>
      </div>
      {lastResult ? (
        <pre
          style={{
            marginTop: 16,
            padding: 12,
            background: "#0f172a",
            borderRadius: 8,
            fontSize: 12,
            whiteSpace: "pre-wrap",
          }}
        >
          {lastResult}
        </pre>
      ) : null}
    </div>
  );
}
