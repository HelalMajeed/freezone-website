"use client";

import { useCallback, useEffect, useState } from "react";
import { freezoneApiUrl } from "@/lib/api-internal";

/**
 * Admin dashboard for the Global Iraq importer.
 *
 * Strictly read-only: lists ImportBatch rows + per-batch products, surfaces CLI
 * commands the operator runs from a workstation. No buttons that could initiate
 * a full import — that path stays gated behind the CLI + `--limit` cap by design.
 *
 * GET /api/admin/import/globaliraq/batches            → list
 * GET /api/admin/import/globaliraq/batches/:id        → detail (batch + products)
 */

type BatchRow = {
  id: string;
  source: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  total: number;
  succeeded: number;
  failed: number;
  lockOwner: string | null;
  notes: string | null;
};

type BatchProduct = {
  id: number;
  nameAr: string;
  nameEn: string;
  sourceUrl: string | null;
  sourceHandle: string | null;
  sourcePrice: number | null;
  price: number;
  oldPrice: number | null;
  warranty: string | null;
  published: boolean;
  importedAt: string | null;
  _count: { images: number; variants: number };
};

type BatchDetail = {
  batch: BatchRow;
  products: BatchProduct[];
};

const card: React.CSSProperties = {
  background: "var(--admin-surface)",
  border: "1px solid var(--admin-border, #1f2937)",
  borderRadius: 10,
  padding: 18,
};

const codeBlock: React.CSSProperties = {
  background: "#0b1220",
  color: "#e2e8f0",
  border: "1px solid #1f2937",
  borderRadius: 8,
  padding: 12,
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
  fontSize: 13,
  whiteSpace: "pre",
  overflowX: "auto",
};

const badge = (bg: string): React.CSSProperties => ({
  display: "inline-block",
  background: bg,
  color: "#0b1220",
  fontSize: 11,
  fontWeight: 700,
  padding: "2px 8px",
  borderRadius: 999,
});

function statusBadge(status: string): React.CSSProperties {
  if (status === "completed") return badge("#10b981");
  if (status === "running") return badge("#fbbf24");
  if (status === "failed" || status === "completed_with_errors") return badge("#f87171");
  if (status === "dry_run") return badge("#94a3b8");
  return badge("#cbd5e1");
}

export default function AdminGlobaliraqImportPage() {
  const [batches, setBatches] = useState<BatchRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<BatchDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(freezoneApiUrl("/api/admin/import/globaliraq/batches?limit=20"), {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { batches: BatchRow[] };
      setBatches(data.batches);
      if (data.batches.length > 0 && !selectedId) setSelectedId(data.batches[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [selectedId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    fetch(freezoneApiUrl(`/api/admin/import/globaliraq/batches/${selectedId}`), {
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BatchDetail;
      })
      .then((d) => { if (!cancelled) setDetail(d); })
      .catch((e) => { if (!cancelled) setDetail(null); console.error("[globaliraq detail]", e); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [selectedId]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "12px 0 32px" }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 22 }}>استيراد منتجات Global Iraq</h1>
        <p style={{ margin: "6px 0 0", color: "var(--admin-muted, #94a3b8)", fontSize: 13, lineHeight: 1.6 }}>
          هذه الصفحة لعرض ومراقبة عمليات الاستيراد فقط. لا يمكن إطلاق Full import من هنا — استخدم سطر الأوامر مع
          <code style={{ margin: "0 4px" }}>--limit</code> وحد أقصى <strong>10 منتجات</strong> لكل تشغيل (sample-only).
        </p>
      </header>

      <section style={card}>
        <h2 style={{ marginTop: 0, fontSize: 16 }}>أوامر التشغيل (sample فقط)</h2>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "var(--admin-muted, #94a3b8)" }}>
          نفّذها من جهازك بعد ضبط <code>DATABASE_URL</code> + <code>FREEZONE_API_URL</code> + <code>FREEZONE_ADMIN_PASSWORD</code>:
        </p>
        <pre style={codeBlock}>{`# 1) اكتشف المنتجات (read-only)
npm run import:globaliraq:discover --prefix freezone-api

# 2) Scrape أول 5 منتجات (يكتب data/mapped/<handle>.json محلياً)
npm run import:globaliraq:scrape --prefix freezone-api -- --limit=5

# 3) Dry-run (لا كتابة في DB ولا API)
npm run import:globaliraq:sample --prefix freezone-api -- --limit=5

# 4) Live (يكتب في DB ويرفع الصور إلى FreeZone — sample-only، حد أقصى 10)
DATABASE_URL=... FREEZONE_API_URL=... FREEZONE_ADMIN_PASSWORD=... \\
  npm run import:globaliraq:sample --prefix freezone-api -- --limit=5 --live

# 5) Verify الـ batch
DATABASE_URL=... npm run import:globaliraq:verify --prefix freezone-api -- --latest

# 6) Dry-run delete (يعدّ ولا يحذف)
DATABASE_URL=... npm run import:globaliraq:dry-delete --prefix freezone-api -- --latest`}</pre>
      </section>

      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>سجل الـ batches</h2>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            style={{ padding: "6px 14px", borderRadius: 8, background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155", cursor: "pointer" }}
          >
            تحديث
          </button>
        </div>
        {loading && <p style={{ margin: 0, color: "var(--admin-muted, #94a3b8)" }}>جاري التحميل…</p>}
        {error && <p style={{ margin: 0, color: "#f87171" }}>{error}</p>}
        {batches && batches.length === 0 && (
          <p style={{ margin: 0, color: "var(--admin-muted, #94a3b8)" }}>
            لم يُنفَّذ أي batch بعد. شغّل خطوات الاستيراد أعلاه وستظهر النتائج هنا.
          </p>
        )}
        {batches && batches.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "start", color: "var(--admin-muted, #94a3b8)" }}>
                <th style={{ padding: "6px 8px" }}>id</th>
                <th style={{ padding: "6px 8px" }}>status</th>
                <th style={{ padding: "6px 8px" }}>total</th>
                <th style={{ padding: "6px 8px" }}>ok</th>
                <th style={{ padding: "6px 8px" }}>failed</th>
                <th style={{ padding: "6px 8px" }}>started</th>
                <th style={{ padding: "6px 8px" }}>lock</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedId(b.id)}
                  style={{
                    cursor: "pointer",
                    background: b.id === selectedId ? "rgba(59,130,246,0.12)" : "transparent",
                    borderTop: "1px solid #1f2937",
                  }}
                >
                  <td style={{ padding: "6px 8px", fontFamily: "ui-monospace, Menlo, monospace" }}>{b.id.slice(0, 12)}…</td>
                  <td style={{ padding: "6px 8px" }}><span style={statusBadge(b.status)}>{b.status}</span></td>
                  <td style={{ padding: "6px 8px" }}>{b.total}</td>
                  <td style={{ padding: "6px 8px", color: "#10b981" }}>{b.succeeded}</td>
                  <td style={{ padding: "6px 8px", color: b.failed > 0 ? "#f87171" : undefined }}>{b.failed}</td>
                  <td style={{ padding: "6px 8px" }}>{new Date(b.startedAt).toLocaleString()}</td>
                  <td style={{ padding: "6px 8px", color: "var(--admin-muted, #94a3b8)", fontSize: 11 }}>{b.lockOwner ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {selectedId && (
        <section style={card}>
          <h2 style={{ marginTop: 0, fontSize: 16 }}>تفاصيل الـ batch</h2>
          {detailLoading && <p style={{ margin: 0, color: "var(--admin-muted, #94a3b8)" }}>جاري التحميل…</p>}
          {!detailLoading && detail && (
            <>
              <p style={{ margin: "0 0 8px", fontFamily: "ui-monospace, monospace", fontSize: 12, color: "var(--admin-muted, #94a3b8)" }}>
                {detail.batch.id}
              </p>
              {detail.batch.notes && (
                <p style={{ margin: "0 0 14px", fontSize: 13 }}>ملاحظات: {detail.batch.notes}</p>
              )}

              {detail.products.length === 0 ? (
                <p style={{ margin: 0, color: "var(--admin-muted, #94a3b8)" }}>لا توجد منتجات مرتبطة بهذا الـ batch.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "start", color: "var(--admin-muted, #94a3b8)" }}>
                      <th style={{ padding: "6px 8px" }}>id</th>
                      <th style={{ padding: "6px 8px" }}>handle</th>
                      <th style={{ padding: "6px 8px" }}>الاسم</th>
                      <th style={{ padding: "6px 8px" }}>price</th>
                      <th style={{ padding: "6px 8px" }}>warranty</th>
                      <th style={{ padding: "6px 8px" }}>imgs</th>
                      <th style={{ padding: "6px 8px" }}>variants</th>
                      <th style={{ padding: "6px 8px" }}>published</th>
                      <th style={{ padding: "6px 8px" }}>links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.products.map((p) => (
                      <tr key={p.id} style={{ borderTop: "1px solid #1f2937" }}>
                        <td style={{ padding: "6px 8px" }}>{p.id}</td>
                        <td style={{ padding: "6px 8px", fontFamily: "ui-monospace, monospace", fontSize: 11 }}>{p.sourceHandle}</td>
                        <td style={{ padding: "6px 8px" }}>{p.nameAr || p.nameEn}</td>
                        <td style={{ padding: "6px 8px" }}>
                          {Intl.NumberFormat("en").format(p.price)} IQD
                          {p.sourcePrice != null && (
                            <div style={{ fontSize: 11, color: "var(--admin-muted, #94a3b8)" }}>من {Intl.NumberFormat("en").format(p.sourcePrice)}</div>
                          )}
                        </td>
                        <td style={{ padding: "6px 8px", color: p.warranty ? undefined : "#f87171" }}>{p.warranty ?? "—"}</td>
                        <td style={{ padding: "6px 8px" }}>{p._count.images}</td>
                        <td style={{ padding: "6px 8px" }}>{p._count.variants}</td>
                        <td style={{ padding: "6px 8px" }}>
                          <span style={badge(p.published ? "#10b981" : "#94a3b8")}>{p.published ? "published" : "draft"}</span>
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <a href={`/admin/products/edit/${p.id}`} style={{ color: "#60a5fa" }}>admin</a>
                          {p.sourceUrl && (
                            <>
                              {" · "}
                              <a href={p.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#60a5fa" }}>source</a>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </section>
      )}

      <section style={{ ...card, borderColor: "#7f1d1d" }}>
        <h2 style={{ marginTop: 0, fontSize: 14, color: "#fca5a5" }}>تنبيه إنتاج</h2>
        <ul style={{ margin: 0, paddingInlineStart: 18, fontSize: 13, lineHeight: 1.8, color: "#fecaca" }}>
          <li>هذا importer مُخصّص للـ sample فقط. لا يوجد زر «Full import» مُتَعمَّداً.</li>
          <li>كل live run محدود بـ <strong>SAMPLE_MAX=10</strong> منتجات. لا يمكن تجاوزها.</li>
          <li>الصور تُحفظ دائماً في <code>/uploads/products/...</code>؛ يُحظر تخزين روابط Shopify/Global Iraq كرابط نهائي.</li>
          <li>الـ dry-run delete لا يحذف شيئاً — يطبع فقط ما كان سيُحذف.</li>
        </ul>
      </section>
    </div>
  );
}
