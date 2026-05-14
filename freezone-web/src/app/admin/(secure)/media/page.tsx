"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";

type Row = {
  id: number;
  url: string;
  kind: string;
  title: string;
  altAr: string;
  altEn: string;
  mimeType: string;
  fileSize: number | null;
};

const KINDS = [
  { v: "image", label: "صورة" },
  { v: "video", label: "فيديو (رابط)" },
  { v: "model3d", label: "نموذج 3D" },
] as const;

export default function AdminMediaPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [meta, setMeta] = useState({ title: "", altAr: "", altEn: "", kind: "image" });

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl(`/api/admin/media?q=${encodeURIComponent(q)}`), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.ok) setRows(await res.json());
  }, [q, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEdit(r: Row) {
    setEditId(r.id);
    setMeta({ title: r.title, altAr: r.altAr, altEn: r.altEn, kind: r.kind });
  }

  async function saveMeta(id: number) {
    const res = await fetch(freezoneApiUrl(`/api/admin/media/${id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: meta.title,
        altAr: meta.altAr,
        altEn: meta.altEn,
        kind: meta.kind,
      }),
    });
    if (!res.ok) {
      setMsg("فشل حفظ البيانات");
      return;
    }
    setMsg("تم حفظ البيانات الوصفية");
    setEditId(null);
    load();
  }

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    fd.append("registerLibrary", "true");
    fd.append("title", file.name);
    const res = await fetch(freezoneApiUrl("/api/admin/upload"), { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) {
      setMsg("فشل الرفع");
      return;
    }
    setMsg("تم الرفع وتسجيل الملف في المكتبة");
    load();
  }

  async function remove(id: number) {
    if (!confirm("حذف السجل من المكتبة؟ (ملف القرص يبقى كما هو حسب إعداد الخادم)")) return;
    await fetch(freezoneApiUrl(`/api/admin/media/${id}`), { method: "DELETE", credentials: "include" });
    setEditId(null);
    load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>مكتبة الوسائط</h1>
        <Link to="/admin/content" style={{ color: "var(--admin-muted)", fontSize: 14 }}>
          بناء الصفحة الرئيسية
        </Link>
      </div>
      <p style={{ color: "var(--admin-muted)", marginBottom: 16, fontSize: 14 }}>
        ارفع صوراً أو GLB/GLTF؛ يُسجَّل الملف تلقائياً عند استخدام مسار الرفع مع «المكتبة». لربط فيديو برابط ثابت، أضف
        سجلاً يدوياً عبر لوحة API أو في المرات القادمة من واجهة «رابط خارجي». انسخ حقل الرابط لاستخدامه في الأقسام
        أو المنتجات.
      </p>
      {msg && <div style={{ marginBottom: 12, color: "#86efac" }}>{msg}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالعنوان أو المسار"
          style={{ padding: 10, flex: 1, minWidth: 200, borderRadius: 8, border: "1px solid #334155", background: "var(--admin-surface)", color: "#fff" }}
        />
        <button type="button" onClick={() => load()} style={{ padding: "10px 16px", background: "var(--admin-border)", color: "#fff", border: "none", borderRadius: 8 }}>
          بحث
        </button>
        <label style={{ padding: "10px 16px", background: "#dc2626", color: "#fff", borderRadius: 8, cursor: "pointer" }}>
          رفع ملف
          <input type="file" hidden accept="image/png,image/jpeg,.png,.jpg,.jpeg,.glb,.gltf" onChange={(e) => void upload(e)} />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {rows.map((m) => (
          <div key={m.id} style={{ border: "1px solid #334155", borderRadius: 10, padding: 10, background: "var(--admin-surface-inset)" }}>
            {m.kind === "image" || m.mimeType.startsWith("image") ? (
              <img src={m.url} alt="" style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 6 }} />
            ) : (
              <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, textAlign: "center", padding: 8 }}>
                {m.kind}
                <br />
                <span dir="ltr" style={{ wordBreak: "break-all", fontSize: 10 }}>
                  {m.url.slice(-28)}
                </span>
              </div>
            )}
            <div style={{ fontSize: 12, marginTop: 8 }}>{m.title || "—"}</div>
            <div style={{ fontSize: 10, color: "#64748b", wordBreak: "break-all" }} dir="ltr">
              {m.url}
            </div>
            {m.fileSize != null && (
              <div style={{ fontSize: 10, color: "var(--admin-border-strong)" }}>{m.fileSize} بايت · {m.mimeType || m.kind}</div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => startEdit(m)} style={btnGhost}>
                تعديل بيانات
              </button>
              <button type="button" onClick={() => void remove(m.id)} style={btnDanger}>
                حذف السجل
              </button>
            </div>
            {editId === m.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #334155", display: "grid", gap: 8 }}>
                <label style={lab}>عنوان / تسمية</label>
                <input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} style={inp} />
                <label style={lab}>وصف بديل AR</label>
                <input value={meta.altAr} onChange={(e) => setMeta({ ...meta, altAr: e.target.value })} style={inp} />
                <label style={lab}>وصف بديل EN</label>
                <input value={meta.altEn} onChange={(e) => setMeta({ ...meta, altEn: e.target.value })} style={inp} dir="ltr" />
                <label style={lab}>النوع</label>
                <select value={meta.kind} onChange={(e) => setMeta({ ...meta, kind: e.target.value })} style={inp}>
                  {KINDS.map((k) => (
                    <option key={k.v} value={k.v}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => void saveMeta(m.id)} style={btnPrimary}>
                  حفظ
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const lab: CSSProperties = { fontSize: 11, color: "var(--admin-muted)" };
const inp: CSSProperties = {
  padding: 8,
  borderRadius: 6,
  border: "1px solid #334155",
  background: "var(--admin-surface)",
  color: "var(--admin-text)",
};
const btnGhost: CSSProperties = {
  padding: "6px 10px",
  background: "transparent",
  border: "1px solid #475569",
  color: "var(--admin-text)",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 12,
};
const btnDanger: CSSProperties = {
  ...btnGhost,
  borderColor: "#7f1d1d",
  color: "#fecaca",
};
const btnPrimary: CSSProperties = {
  padding: "8px 12px",
  background: "#dc2626",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
};
