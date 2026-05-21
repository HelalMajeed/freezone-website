"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { FacetAttributeDef } from "@/lib/data";
import { validateFacetAttributesForSave } from "@/lib/facet-attributes";
import { FacetKeysWorkspace } from "@/components/admin/facet/FacetKeysWorkspace";
import { freezoneApiUrl } from "@/lib/api-internal";
import styles from "./AdminCategoryAttributesManager.module.css";

type AttrTab = "all" | "filterable" | "display";

export function AdminCategoryAttributesManager() {
  const navigate = useNavigate();
  const params = useParams();
  const categoryId = parseInt(params.id ?? "", 10);
  const [slug, setSlug] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [attributes, setAttributes] = useState<FacetAttributeDef[]>([]);
  const [tab, setTab] = useState<AttrTab>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!Number.isFinite(categoryId)) return;
    setLoading(true);
    const [catRes, attrRes] = await Promise.all([
      fetch(freezoneApiUrl("/api/admin/categories"), { credentials: "include", cache: "no-store" }),
      fetch(freezoneApiUrl(`/api/admin/categories/${categoryId}/attributes`), {
        credentials: "include",
        cache: "no-store",
      }),
    ]);
    if (catRes.status === 401 || attrRes.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (catRes.ok) {
      const cats = (await catRes.json()) as { id: number; slug: string; nameEn: string }[];
      const cat = cats.find((c) => c.id === categoryId);
      if (cat) {
        setSlug(cat.slug);
        setNameEn(cat.nameEn);
      }
    }
    if (attrRes.ok) {
      const data = (await attrRes.json()) as { categoryAttributes: FacetAttributeDef[] };
      setAttributes(data.categoryAttributes ?? []);
    }
    setLoading(false);
  }, [categoryId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredAttrs = useMemo(() => {
    let list = [...attributes];
    if (tab === "filterable") list = list.filter((a) => a.filterable);
    if (tab === "display") list = list.filter((a) => !a.filterable);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) =>
        a.key.toLowerCase().includes(q) ||
        (a.name_en ?? "").toLowerCase().includes(q) ||
        (a.name_ar ?? "").toLowerCase().includes(q),
    );
  }, [attributes, tab, search]);

  async function save() {
    const v = validateFacetAttributesForSave(attributes);
    if (!v.ok) {
      setMsg(v.error);
      return;
    }
    setSaving(true);
    setMsg("");
    const res = await fetch(freezoneApiUrl(`/api/admin/categories/${categoryId}`), {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ facetKeys: attributes }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(j?.error ?? "فشل الحفظ");
      return;
    }
    setMsg("تم حفظ المواصفات");
    void load();
  }

  if (!Number.isFinite(categoryId)) {
    return <p>معرّف قسم غير صالح</p>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <Link to={`/admin/categories/${categoryId}`} className={styles.back}>
            ← إدارة القسم
          </Link>
          <Link to="/admin/categories" className={styles.back} style={{ marginInlineStart: 12 }}>
            كل الأقسام
          </Link>
          <h1 className={styles.title}>سمات القسم — {nameEn || slug}</h1>
          <p className={styles.sub}>
            هنا تحدد فلاتر القسم: الاسم، النوع (Checkbox / Select / Range)، والخيارات. عند إضافة منتج يختار الموظف قيمة
            الفلتر ويكتب المواصفة الموسعة بجانبها. الفلاتر تظهر في صفحة القسم فقط؛ المواصفات الموسعة في صفحة المنتج.
          </p>
        </div>
        <button type="button" className={styles.saveBtn} disabled={saving} onClick={() => void save()}>
          {saving ? "جاري الحفظ…" : "حفظ الكل"}
        </button>
      </div>

      <div className={styles.tabs}>
        {(
          [
            ["all", "الكل"],
            ["filterable", "فلاتر الواجهة"],
            ["display", "مواصفات المنتج"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`${styles.tab} ${tab === id ? styles.tabActive : ""}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <input
          type="search"
          className={styles.search}
          placeholder="بحث attributes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {msg ? <p className={styles.msg}>{msg}</p> : null}

      {loading ? (
        <p>جاري التحميل…</p>
      ) : (
        <>
          <div className={styles.summary}>
            {filteredAttrs.map((a) => (
              <span key={a.key} className={a.filterable ? styles.badgeFilter : styles.badgeDisplay}>
                {a.key}
                {a.filterable ? " · فلتر" : " · عرض"}
              </span>
            ))}
            {filteredAttrs.length === 0 ? <span style={{ opacity: 0.7 }}>لا نتائج في هذا التبويب</span> : null}
          </div>
          <FacetKeysWorkspace
            value={attributes}
            onChange={setAttributes}
            context={{ slug, nameEn }}
            onSave={() => save()}
            savePending={saving}
            manualOnly
            singleScroll
          />
        </>
      )}
    </div>
  );
}
