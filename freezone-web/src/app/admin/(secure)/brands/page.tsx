"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { uploadAdminImage } from "@/lib/admin-upload-image";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";

type BrandRow = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  logoUrl: string | null;
  sortOrder: number;
  active: boolean;
};

export default function AdminBrandsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<BrandRow[]>([]);
  const [nameEn, setNameEn] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl("/api/admin/brands"), { credentials: "include" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.status === 503) {
      setErr("قاعدة البيانات غير متاحة");
      setRows([]);
      return;
    }
    if (res.ok) setRows(await res.json());
    setErr("");
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const res = await fetch(freezoneApiUrl("/api/admin/brands"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nameEn: nameEn.trim(), nameAr: nameAr.trim() || nameEn.trim() }),
    });
    if (!res.ok) {
      setErr("فشل الإنشاء");
      return;
    }
    setNameEn("");
    setNameAr("");
    setMsg("تمت إضافة العلامة");
    void load();
  }

  async function patch(id: number, patch: Partial<BrandRow>) {
    await fetch(freezoneApiUrl(`/api/admin/brands/${id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    void load();
  }

  async function uploadLogo(id: number, file: File) {
    try {
      const url = await uploadAdminImage(file);
      await patch(id, { logoUrl: url });
      setMsg("تم تحديث الشعار");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "فشل الرفع");
    }
  }

  async function remove(id: number) {
    if (!(await confirmDialog({ title: "حذف علامة", message: "حذف العلامة؟ سيتم فصل المنتجات المرتبطة.", confirmLabel: "حذف", danger: true }))) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/brands/${id}`), { method: "DELETE", credentials: "include" });
    if (!res.ok) setErr("فشل الحذف");
    else void load();
  }

  return (
    <div style={{ padding: 24, maxWidth: 900 }}>
      <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, flex: 1 }}>العلامات التجارية</h1>
        <Link to="/admin/products" style={{ color: "var(--admin-muted)" }}>
          المنتجات
        </Link>
      </div>
      <p style={{ color: "var(--admin-muted)", fontSize: 14, marginBottom: 16 }}>
        تُستخدَم في ربط المنتجات عبر <code>brandId</code>؛ يُعرض اسم العلامة في الكتالوج عند الربط.
      </p>
      {err && <div style={{ color: "#fecaca", marginBottom: 8 }}>{err}</div>}
      {msg && <div style={{ color: "#86efac", marginBottom: 8 }}>{msg}</div>}

      <form onSubmit={create} style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 28, alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 12, color: "var(--admin-muted)", display: "block" }}>الاسم EN</label>
          <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} required style={field} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--admin-muted)", display: "block" }}>الاسم AR</label>
          <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} style={field} />
        </div>
        <button type="submit" style={{ padding: "10px 18px", background: "#0b1f3b", color: "#fff", border: "none", borderRadius: 8 }}>
          إضافة
        </button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155", color: "var(--admin-muted)", textAlign: "right" }}>
              <th style={{ padding: 8 }}>#</th>
              <th style={{ padding: 8 }}>slug</th>
              <th style={{ padding: 8 }}>EN / AR</th>
              <th style={{ padding: 8 }}>شعار</th>
              <th style={{ padding: 8 }}>ترتيب</th>
              <th style={{ padding: 8 }}>نشط</th>
              <th style={{ padding: 8 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <tr key={b.id} style={{ borderBottom: "1px solid var(--admin-border)" }}>
                <td style={{ padding: 8 }}>{b.id}</td>
                <td style={{ padding: 8, fontFamily: "monospace", fontSize: 12 }} dir="ltr">
                  {b.slug}
                </td>
                <td style={{ padding: 8 }}>
                  <input
                    defaultValue={b.nameEn}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== b.nameEn) void patch(b.id, { nameEn: v });
                    }}
                    style={{ ...field, width: "100%", maxWidth: 120 }}
                  />
                  <input
                    defaultValue={b.nameAr}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v && v !== b.nameAr) void patch(b.id, { nameAr: v });
                    }}
                    style={{ ...field, width: "100%", maxWidth: 120, marginTop: 6 }}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  {b.logoUrl && (
                    <img src={b.logoUrl} alt="" style={{ height: 36, borderRadius: 4 }} />
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void uploadLogo(b.id, f);
                    }}
                    style={{ display: "block", marginTop: 6, fontSize: 11 }}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <input
                    type="number"
                    defaultValue={b.sortOrder}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value, 10);
                      if (Number.isFinite(n) && n !== b.sortOrder) void patch(b.id, { sortOrder: n });
                    }}
                    style={{ width: 64, ...field }}
                  />
                </td>
                <td style={{ padding: 8 }}>
                  <input type="checkbox" checked={b.active} onChange={() => void patch(b.id, { active: !b.active })} />
                </td>
                <td style={{ padding: 8 }}>
                  <button
                    type="button"
                    onClick={() => void remove(b.id)}
                    style={{ padding: "6px 10px", background: "transparent", border: "1px solid #7f1d1d", color: "#fecaca", borderRadius: 6 }}
                  >
                    حذف
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && !err && <p style={{ color: "#64748b" }}>لا علامات بعد.</p>}
    </div>
  );
}

const field: CSSProperties = {
  padding: 8,
  borderRadius: 6,
  background: "var(--admin-surface-muted)",
  color: "var(--admin-text)",
  border: "1px solid #334155",
};
