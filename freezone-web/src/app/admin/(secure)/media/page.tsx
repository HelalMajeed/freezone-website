"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import styles from "./AdminMedia.module.css";

type Row = {
  id: number;
  url: string;
  kind: string;
  title: string;
  altAr: string;
  altEn: string;
  mimeType: string;
  fileSize: number | null;
  createdAt?: string;
};

function formatBytes(n: number | null): string {
  if (n == null) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeBadge(mime: string, kind: string): string {
  if (mime.includes("webp")) return "WebP";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  if (kind === "video") return "فيديو";
  if (kind === "model3d") return "3D";
  return kind || "ملف";
}

function sizeBucket(bytes: number | null): "small" | "medium" | "large" | "unknown" {
  if (bytes == null) return "unknown";
  if (bytes < 100_000) return "small";
  if (bytes < 1_000_000) return "medium";
  return "large";
}

export default function AdminMediaPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [msg, setMsg] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [drawer, setDrawer] = useState<Row | null>(null);
  const [meta, setMeta] = useState({ title: "", altAr: "", altEn: "", kind: "image" });

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl(`/api/admin/media?q=${encodeURIComponent(q)}`), {
      credentials: "include",
    });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.ok) setRows(await res.json());
  }, [q, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return rows.filter((m) => {
      if (kindFilter && m.kind !== kindFilter) return false;
      if (sizeFilter && sizeBucket(m.fileSize) !== sizeFilter) return false;
      return true;
    });
  }, [rows, kindFilter, sizeFilter]);

  async function upload(files: FileList | File[] | null) {
    const list = files ? [...files] : [];
    if (!list.length) return;
    for (const file of list) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("registerLibrary", "true");
      fd.append("title", file.name);
      const res = await fetch(freezoneApiUrl("/api/admin/upload"), {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        setMsg("فشل رفع أحد الملفات");
        return;
      }
    }
    setMsg(`تم رفع ${list.length} ملف`);
    load();
  }

  async function remove(ids: number[]) {
    if (
      !(await confirmDialog({
        title: "حذف من المكتبة",
        message: `حذف ${ids.length} سجل من المكتبة؟`,
        confirmLabel: "حذف",
        danger: true,
      }))
    )
      return;
    for (const id of ids) {
      await fetch(freezoneApiUrl(`/api/admin/media/${id}`), { method: "DELETE", credentials: "include" });
    }
    setSelected(new Set());
    setDrawer(null);
    load();
  }

  async function saveMeta(id: number) {
    const res = await fetch(freezoneApiUrl(`/api/admin/media/${id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meta),
    });
    if (!res.ok) {
      setMsg("فشل حفظ البيانات");
      return;
    }
    setMsg("تم حفظ البيانات الوصفية");
    load();
  }

  function openDrawer(r: Row) {
    setDrawer(r);
    setMeta({ title: r.title, altAr: r.altAr, altEn: r.altEn, kind: r.kind });
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.wrap} dir="rtl">
      <AdminPageHeader
        title="مكتبة الوسائط"
        description="رفع وإدارة الصور والملفات — 6–8 صور في الصف على شاشة عريضة"
        actions={
          <Link to="/admin/content" style={{ color: "var(--admin-muted)", fontSize: 14 }}>
            بناء الصفحة الرئيسية
          </Link>
        }
      />
      {msg ? <div style={{ marginBottom: 12, color: "#86efac" }}>{msg}</div> : null}

      <div className={styles.toolbar}>
        <input
          className={styles.search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="بحث بالعنوان أو المسار"
        />
        <button type="button" className={styles.btnGhost} onClick={() => void load()}>
          بحث
        </button>
        <label className={styles.btnPrimary} style={{ cursor: "pointer" }}>
          رفع جديد
          <input
            type="file"
            hidden
            multiple
            accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp,.glb,.gltf"
            onChange={(e) => void upload(e.target.files)}
          />
        </label>
        {selected.size > 0 ? (
          <button type="button" className={styles.btnDanger} onClick={() => void remove([...selected])}>
            حذف المحدد ({selected.size})
          </button>
        ) : null}
      </div>

      <div className={styles.layout}>
        <aside className={styles.filters}>
          <strong style={{ fontSize: 13 }}>فلاتر</strong>
          <label className={styles.filterLabel}>
            النوع
            <select className={styles.filterSelect} value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
              <option value="">الكل</option>
              <option value="image">صورة</option>
              <option value="video">فيديو</option>
              <option value="model3d">نموذج 3D</option>
            </select>
          </label>
          <label className={styles.filterLabel}>
            الحجم
            <select className={styles.filterSelect} value={sizeFilter} onChange={(e) => setSizeFilter(e.target.value)}>
              <option value="">الكل</option>
              <option value="small">صغير (&lt;100KB)</option>
              <option value="medium">متوسط</option>
              <option value="large">كبير (&gt;1MB)</option>
            </select>
          </label>
          <p style={{ fontSize: 12, color: "var(--admin-muted)", margin: 0 }}>
            {filtered.length} من {rows.length} ملف
          </p>
        </aside>

        <div className={styles.grid}>
          {filtered.map((m) => (
            <div
              key={m.id}
              className={`${styles.card} ${selected.has(m.id) ? styles.cardSelected : ""}`}
              onClick={() => openDrawer(m)}
              onKeyDown={(e) => e.key === "Enter" && openDrawer(m)}
              role="button"
              tabIndex={0}
            >
              <input
                type="checkbox"
                checked={selected.has(m.id)}
                onChange={(e) => {
                  e.stopPropagation();
                  toggleSelect(m.id);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ position: "absolute", top: 10, insetInlineStart: 10, zIndex: 2 }}
              />
              {m.kind === "image" || m.mimeType.startsWith("image") ? (
                <img src={m.url} alt="" className={styles.thumb} loading="lazy" />
              ) : (
                <div className={styles.thumbPlaceholder}>{m.kind}</div>
              )}
              <div style={{ fontSize: 12, marginTop: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m.title || "—"}
              </div>
              <div className={styles.badges}>
                <span className={styles.badge}>{mimeBadge(m.mimeType, m.kind)}</span>
                <span className={styles.badge}>{formatBytes(m.fileSize)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {drawer ? (
        <>
          <div className={styles.drawerBackdrop} onClick={() => setDrawer(null)} />
          <aside className={styles.drawer}>
            <button type="button" className={styles.btnGhost} onClick={() => setDrawer(null)} style={{ marginBottom: 12 }}>
              إغلاق
            </button>
            {drawer.kind === "image" ? (
              <img src={drawer.url} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12 }} />
            ) : null}
            <p dir="ltr" style={{ fontSize: 11, wordBreak: "break-all", color: "#94a3b8" }}>
              {drawer.url}
            </p>
            <label style={{ display: "block", marginTop: 12, fontSize: 12 }}>عنوان</label>
            <input
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />
            <label style={{ display: "block", fontSize: 12 }}>وصف بديل AR</label>
            <input
              value={meta.altAr}
              onChange={(e) => setMeta({ ...meta, altAr: e.target.value })}
              style={{ width: "100%", padding: 8, marginBottom: 8 }}
            />
            <label style={{ display: "block", fontSize: 12 }}>وصف بديل EN</label>
            <input
              value={meta.altEn}
              onChange={(e) => setMeta({ ...meta, altEn: e.target.value })}
              dir="ltr"
              style={{ width: "100%", padding: 8, marginBottom: 12 }}
            />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" className={styles.btnPrimary} onClick={() => void saveMeta(drawer.id)}>
                حفظ
              </button>
              <button type="button" className={styles.btnDanger} onClick={() => void remove([drawer.id])}>
                حذف
              </button>
            </div>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 16 }}>
              للبحث عن استخدام الصورة في منتج، انسخ الرابط وابحث في محرر المنتج أو مكتبة الوسائط.
            </p>
          </aside>
        </>
      ) : null}
    </div>
  );
}
