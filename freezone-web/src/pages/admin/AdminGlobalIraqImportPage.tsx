"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";

type ImportReport = {
  startedAt?: string;
  finishedAt?: string;
  imported?: number;
  updated?: number;
  skipped?: number;
  failed?: number;
  imagesCopied?: number;
  imagesFailed?: number;
  productsWithoutSku?: number;
  productsWithoutImages?: number;
  productsWithoutSpecs?: number;
  errors?: { handle: string; message: string }[];
};

export default function AdminGlobalIraqImportPage() {
  const [report, setReport] = useState<ImportReport | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch(freezoneApiUrl("/api/admin/import/globaliraq/report"), {
        credentials: "include",
      });
      if (res.ok) setReport((await res.json()) as ImportReport);
      else if (res.status !== 404) setErr("تعذّر تحميل آخر تقرير");
    })();
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 920 }}>
      <Link to="/admin/products" style={{ color: "var(--admin-muted)", fontSize: 13 }}>
        ← المنتجات
      </Link>
      <h1 style={{ margin: "16px 0 8px", fontSize: 24 }}>استيراد Global Iraq</h1>
      <p style={{ color: "var(--admin-muted)", lineHeight: 1.6 }}>
        الاستيراد يتم عبر سكربت CLI (آمن، idempotent). لا يُنفَّذ من المتصفح مباشرة — شغّل الأوامر
        من جهازك مع <code>DATABASE_URL</code> الصحيح.
      </p>

      <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>تجربة 5 منتجات</h2>
        <pre style={codeBlock}>
          {`cd freezone-api
npm run import:globaliraq:test`}
        </pre>
      </section>

      <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>الاستيراد الكامل (بعد الموافقة)</h2>
        <pre style={codeBlock}>
          {`npx tsx scripts/import-globaliraq-products.ts --export-dir "C:\\Users\\Helal\\Downloads\\GlobalIraq_COMPLETE_Recovery_Export"`}
        </pre>
      </section>

      <section style={{ marginTop: 20, display: "grid", gap: 12 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>تحديث المنتجات الموجودة</h2>
        <pre style={codeBlock}>
          {`npx tsx scripts/import-globaliraq-products.ts --update --export-dir "C:\\Users\\Helal\\Downloads\\GlobalIraq_COMPLETE_Recovery_Export"`}
        </pre>
      </section>

      <p style={{ marginTop: 20, fontSize: 13, color: "var(--admin-muted)" }}>
        التوثيق الكامل: <code>docs/GLOBALIRAQ_IMPORT_README.md</code>
      </p>

      {err ? <p style={{ color: "#fecaca" }}>{err}</p> : null}
      {report ? (
        <section style={{ marginTop: 28, padding: 16, borderRadius: 10, border: "1px solid #334155" }}>
          <h2 style={{ fontSize: 16, margin: "0 0 12px" }}>آخر تقرير استيراد</h2>
          <ul style={{ margin: 0, paddingInlineStart: 20, lineHeight: 1.8 }}>
            <li>imported: {report.imported ?? 0}</li>
            <li>updated: {report.updated ?? 0}</li>
            <li>skipped: {report.skipped ?? 0}</li>
            <li>failed: {report.failed ?? 0}</li>
            <li>images copied: {report.imagesCopied ?? 0}</li>
            <li>without specs: {report.productsWithoutSpecs ?? 0}</li>
          </ul>
          {report.finishedAt ? (
            <p style={{ margin: "12px 0 0", fontSize: 12, opacity: 0.75 }}>
              {new Date(report.finishedAt).toLocaleString("ar-IQ")}
            </p>
          ) : null}
        </section>
      ) : (
        <p style={{ marginTop: 20, fontSize: 13, color: "var(--admin-muted)" }}>لا يوجد تقرير بعد — شغّل تجربة 5 منتجات أولاً.</p>
      )}
    </div>
  );
}

const codeBlock: React.CSSProperties = {
  margin: 0,
  padding: 14,
  borderRadius: 8,
  background: "var(--admin-surface-inset)",
  border: "1px solid #334155",
  overflowX: "auto",
  fontSize: 13,
  direction: "ltr",
  textAlign: "left",
};
