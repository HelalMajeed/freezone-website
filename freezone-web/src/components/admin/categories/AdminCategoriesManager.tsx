"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { partitionFacetAttributes } from "@/lib/classification/attribute-sets";
import { parseFacetAttributesFromUnknown } from "@/lib/facet-attributes";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { AdminLoadingState } from "@/components/admin/ui/AdminLoadingState";
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
  attributeCount?: number;
  categoryAttributes?: unknown[];
  facetKeys?: unknown;
};

function categoryAttrCounts(row: AdminCategoryRow): { filters: number; display: number } {
  const attrs = parseFacetAttributesFromUnknown(row.categoryAttributes ?? row.facetKeys);
  const { filterableSpecs, extendedSpecs } = partitionFacetAttributes(attrs);
  return { filters: filterableSpecs.length, display: extendedSpecs.length };
}

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
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "inactive">("");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [qualityBySlug, setQualityBySlug] = useState<Record<string, number>>({});

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
      const counts: Record<string, number> = {};
      for (const tab of ["missing_images", "missing_specs", "invalid_filters"] as const) {
        const qRes = await fetch(
          freezoneApiUrl(`/api/admin/data-quality?tab=${tab}&page=1&limit=100`),
          { credentials: "include" },
        );
        if (!qRes.ok) continue;
        const j = (await qRes.json()) as {
          items: { categorySlug: string }[];
        };
        for (const item of j.items ?? []) {
          if (item.categorySlug) counts[item.categorySlug] = (counts[item.categorySlug] ?? 0) + 1;
        }
      }
      setQualityBySlug(counts);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const parentName = useMemo(() => {
    const m = new Map(rows.map((r) => [r.id, r.nameAr || r.nameEn]));
    return (id: number | null) => (id != null ? m.get(id) ?? `#${id}` : "—");
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = [...rows];
    if (statusFilter === "active") list = list.filter((r) => r.active !== false);
    if (statusFilter === "inactive") list = list.filter((r) => r.active === false);
    if (q) {
      list = list.filter(
        (r) =>
          r.nameEn.toLowerCase().includes(q) ||
          r.nameAr.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }, [rows, search, statusFilter]);

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
      setMsg("الاسم بالإنجليزية مطلوب");
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
      setMsg("هذا القسم يحتوي منتجات. عطّله بدل الحذف.");
      return;
    }
    if (!(await confirmDialog({ title: "حذف قسم", message: `حذف القسم «${row.nameAr || row.nameEn}»؟`, confirmLabel: "حذف", danger: true }))) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/categories/${row.id}`), {
      method: "DELETE",
      credentials: "include",
    });
    if (res.status === 409) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(j?.error ?? "لا يمكن الحذف — القسم مرتبط بمنتجات.");
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
      <AdminPageHeader
        title="الأقسام"
        description="المدخل الرئيسي للكتالوج — اختر قسماً لإضافة المنتجات وإدارة الفلاتر ومواصفات العرض."
        actions={
          <button type="button" className={styles.btnPrimary} onClick={openCreate}>
            + قسم جديد
          </button>
        }
      />

      <div className={styles.toolbar}>
        <input
          type="search"
          className={styles.input}
          placeholder="بحث بالاسم أو المعرف…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.input}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "inactive")}
        >
          <option value="">كل الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">معطّل</option>
        </select>
      </div>

      {msg ? (
        <div className={`${styles.msg} ${msg.includes("فشل") ? styles.msgErr : styles.msgOk}`}>{msg}</div>
      ) : null}

      {loading ? (
        <AdminLoadingState message="جاري تحميل الأقسام…" />
      ) : filtered.length === 0 ? (
        <p style={{ color: "var(--admin-muted)" }}>لا توجد أقسام مطابقة.</p>
      ) : (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>القسم</th>
                <th>المعرف</th>
                <th>الأب</th>
                <th>المنتجات</th>
                <th>فلاتر</th>
                <th>مواصفات عرض</th>
                <th>الترتيب</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td>
                    <strong>{r.nameAr || r.nameEn}</strong>
                    <div className={styles.subEn}>{r.nameEn}</div>
                  </td>
                  <td dir="ltr">{r.slug}</td>
                  <td>{parentName(r.parentId)}</td>
                  <td>{r.primaryProductCount ?? 0}</td>
                  <td>{categoryAttrCounts(r).filters}</td>
                  <td>{categoryAttrCounts(r).display}</td>
                  <td>
                    {(qualityBySlug[r.slug] ?? 0) > 0 ? (
                      <span className={styles.badgeWarn}>{qualityBySlug[r.slug]}</span>
                    ) : (
                      <span className={styles.badgeOn}>—</span>
                    )}
                  </td>
                  <td>{r.sortOrder}</td>
                  <td>
                    <span className={r.active !== false ? styles.badgeOn : styles.badgeOff}>
                      {r.active !== false ? "نشط" : "معطّل"}
                    </span>
                  </td>
                  <td className={styles.actionsCell}>
                    <div className={styles.rowActions}>
                      <Link className={styles.btnLink} to={`/admin/categories/${r.id}`}>
                        إدارة القسم
                      </Link>
                      <Link className={styles.btnLink} to={`/admin/categories/${r.id}?tab=products`}>
                        المنتجات
                      </Link>
                      <Link
                        className={styles.btnLinkPrimary}
                        to={`/admin/categories/${r.id}/products/new`}
                      >
                        + منتج
                      </Link>
                    </div>
                    <button
                      type="button"
                      className={styles.menuBtn}
                      onClick={() => setOpenMenuId(openMenuId === r.id ? null : r.id)}
                      aria-label="المزيد"
                    >
                      ⋮
                    </button>
                    {openMenuId === r.id ? (
                      <div className={styles.menu}>
                        <button type="button" onClick={() => { setOpenMenuId(null); openEdit(r); }}>
                          تعديل
                        </button>
                        <Link to={`/admin/categories/${r.id}?tab=filters`} onClick={() => setOpenMenuId(null)}>
                          الفلاتر والمواصفات
                        </Link>
                        <Link to={`/admin/categories/${r.id}/attributes`} onClick={() => setOpenMenuId(null)}>
                          محرر السمات
                        </Link>
                        <button type="button" onClick={() => { setOpenMenuId(null); void toggleActive(r); }}>
                          {r.active !== false ? "تعطيل" : "تفعيل"}
                        </button>
                        <button type="button" className={styles.menuDanger} onClick={() => { setOpenMenuId(null); void tryDelete(r); }}>
                          حذف
                        </button>
                      </div>
                    ) : null}
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
              الاسم (إنجليزي)
              <input value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} />
            </label>
            <label className={styles.field}>
              الاسم (عربي)
              <input value={form.nameAr} onChange={(e) => setForm((f) => ({ ...f, nameAr: e.target.value }))} />
            </label>
            <label className={styles.field}>
              المعرف (slug)
              <input value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} dir="ltr" />
            </label>
            <label className={styles.field}>
              القسم الأب
              <select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))}>
                <option value="">— بدون —</option>
                {rows
                  .filter((c) => c.id !== editId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr || c.nameEn}
                    </option>
                  ))}
              </select>
            </label>
            <label className={styles.field}>
              الترتيب
              <input value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </label>
            <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              نشط
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
