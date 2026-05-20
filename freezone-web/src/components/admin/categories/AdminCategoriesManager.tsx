"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import styles from "./AdminCategoriesManager.module.css";

export type AdminCategoryRow = {
  id: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  parentId: number | null;
  sortOrder: number;
  active: boolean;
  primaryProductCount?: number;
  secondaryLinkCount?: number;
};

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string;
  sortOrder: string;
  active: boolean;
};

const emptyForm = (): FormState => ({
  nameEn: "",
  nameAr: "",
  slug: "",
  parentId: "",
  sortOrder: "999",
  active: true,
});

export function AdminCategoriesManager() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AdminCategoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include", cache: "no-store" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as AdminCategoryRow[];
      setRows(data);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const parentName = useMemo(() => {
    const m = new Map(rows.map((r) => [r.id, r.nameEn]));
    return (id: number | null) => (id != null ? m.get(id) ?? `#${id}` : "—");
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [...rows].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return rows
      .filter(
        (r) =>
          r.nameEn.toLowerCase().includes(q) ||
          r.nameAr.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q),
      )
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [rows, search]);

  function openCreate() {
    setForm(emptyForm());
    setEditId(null);
    setModal("create");
  }

  function openEdit(row: AdminCategoryRow) {
    setForm({
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      slug: row.slug,
      parentId: row.parentId != null ? String(row.parentId) : "",
      sortOrder: String(row.sortOrder),
      active: row.active !== false,
    });
    setEditId(row.id);
    setModal("edit");
  }

  async function saveForm() {
    if (!form.nameEn.trim()) {
      setMsg("الاسم EN مطلوب");
      return;
    }
    setSaving(true);
    setMsg("");
    const payload = {
      nameEn: form.nameEn.trim(),
      nameAr: form.nameAr.trim() || form.nameEn.trim(),
      slug: form.slug.trim() || undefined,
      parentId: form.parentId ? Number(form.parentId) : null,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
      active: form.active,
    };
    const url =
      modal === "create"
        ? freezoneApiUrl("/api/admin/categories")
        : freezoneApiUrl(`/api/admin/categories/${editId}`);
    const res = await fetch(url, {
      method: modal === "create" ? "POST" : "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(j?.error ?? "فشل الحفظ");
      return;
    }
    setModal(null);
    setMsg("تم الحفظ");
    void load();
  }

  async function toggleActive(row: AdminCategoryRow) {
    const res = await fetch(freezoneApiUrl(`/api/admin/categories/${row.id}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !row.active }),
    });
    if (!res.ok) {
      setMsg("فشل تحديث الحالة");
      return;
    }
    void load();
  }

  async function tryDelete(row: AdminCategoryRow) {
    const count = row.primaryProductCount ?? 0;
    if (count > 0) {
      setMsg("This category has products. Disable it instead of deleting.");
      return;
    }
    if (!confirm(`حذف القسم «${row.nameEn}»؟`)) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/categories/${row.id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.status === 409) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(j?.error ?? "This category has products. Disable it instead of deleting.");
      return;
    }
    if (!res.ok) {
      setMsg("فشل الحذف");
      return;
    }
    setMsg("تم الحذف");
    void load();
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Categories</h1>
          <p className={styles.sub}>إدارة الأقسام، الترتيب، والحالة. المواصفات من صفحة Attributes.</p>
        </div>
        <button type="button" className={styles.btnPrimary} onClick={openCreate}>
          + قسم جديد
        </button>
      </div>

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.input}
          placeholder="بحث بالاسم أو slug…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {msg ? (
        <div className={`${styles.msg} ${msg.includes("فشل") || msg.includes("products") ? styles.msgErr : styles.msgOk}`}>
          {msg}
        </div>
      ) : null}

      {loading ? (
        <p style={{ color: "var(--admin-muted)" }}>جاري التحميل…</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Slug</th>
                <th>Parent</th>
                <th>Products</th>
                <th>Sort</th>
                <th>Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.nameEn}</strong>
                    <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{r.nameAr}</div>
                  </td>
                  <td>{r.slug}</td>
                  <td>{parentName(r.parentId)}</td>
                  <td>{r.primaryProductCount ?? 0}</td>
                  <td>{r.sortOrder}</td>
                  <td>
                    <span className={r.active !== false ? styles.badgeOn : styles.badgeOff}>
                      {r.active !== false ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button type="button" className={styles.link} onClick={() => openEdit(r)}>
                        Edit
                      </button>
                      <Link className={styles.link} to={`/admin/categories/${r.id}/attributes`}>
                        Attributes
                      </Link>
                      <button type="button" className={styles.link} onClick={() => void toggleActive(r)}>
                        {r.active !== false ? "Disable" : "Enable"}
                      </button>
                      <button type="button" className={styles.link} onClick={() => void tryDelete(r)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal ? (
        <div className={styles.modalBackdrop} role="dialog" aria-modal>
          <div className={styles.modal}>
            <h2 style={{ margin: 0 }}>{modal === "create" ? "قسم جديد" : "تعديل القسم"}</h2>
            <label className={styles.field}>
              name_en
              <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
            </label>
            <label className={styles.field}>
              name_ar
              <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </label>
            <label className={styles.field}>
              slug
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} dir="ltr" />
            </label>
            <label className={styles.field}>
              parent
              <select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">— none —</option>
                {rows
                  .filter((c) => c.id !== editId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameEn}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.field}>
              sortOrder
              <input value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Active
            </label>
            <div className={styles.modalActions}>
              <button type="button" onClick={() => setModal(null)}>
                إلغاء
              </button>
              <button type="button" className={styles.btnPrimary} disabled={saving} onClick={() => void saveForm()}>
                {saving ? "…" : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
