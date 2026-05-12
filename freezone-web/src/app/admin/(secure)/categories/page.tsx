"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, SlidersHorizontal } from "lucide-react";
import clsx from "clsx";
import { getFacetCatalogOrder, parseAdminCategoryFacetKeys } from "@/components/admin/facet/facet-keys-utils";
import type { FacetAttributeDef } from "@/lib/data";
import { validateFacetAttributesForSave } from "@/lib/facet-attributes";
import { CategoryCard, type CategoryCardData } from "./CategoryCard";
import { CategoryGrid } from "./CategoryGrid";
import { CategorySearchBar } from "./CategorySearchBar";
import { CategoryDetailsDrawer, type DrawerCategory } from "./CategoryDetailsDrawer";
import { AddCategoryModal } from "./AddCategoryModal";
import styles from "./admin-categories.module.css";

type Cat = CategoryCardData & {
  backgroundImageUrl: string | null;
  /** Present on API responses; used for baseline parsing only. */
  facetKeys?: unknown;
};

const CATALOG_FIELD_TOTAL = getFacetCatalogOrder().length;

export default function AdminCategoriesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Cat[]>([]);
  const [facetAttrsById, setFacetAttrsById] = useState<Record<number, FacetAttributeDef[]>>({});
  const [drawerBaselineAttrs, setDrawerBaselineAttrs] = useState<FacetAttributeDef[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"sortOrder" | "nameEn" | "nameAr">("sortOrder");

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);

  const [rtl, setRtl] = useState(false);
  useEffect(() => {
    setRtl(document.documentElement.getAttribute("dir") === "rtl");
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/categories", { credentials: "include", cache: "no-store" });
    if (res.status === 401) {
      navigate("/admin/login", { replace: true });
      return;
    }
    if (res.ok) {
      const data = (await res.json()) as (Cat & { backgroundImageUrl?: string | null })[];
      setRows(
        data.map((r) => ({
          ...r,
          backgroundImageUrl: r.backgroundImageUrl ?? null,
        })),
      );
      const ft: Record<number, FacetAttributeDef[]> = {};
      for (const r of data) {
        ft[r.id] = parseAdminCategoryFacetKeys(r.slug, r.facetKeys);
      }
      setFacetAttrsById(ft);
    }
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSelectedId(null);
        setCreateOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const importCategoryOptions = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        nameAr: r.nameAr,
        nameEn: r.nameEn,
        slug: r.slug,
        facetAttributes: facetAttrsById[r.id] ?? [],
      })),
    [rows, facetAttrsById],
  );

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (q) {
      list = rows.filter(
        (r) =>
          r.nameEn.toLowerCase().includes(q) ||
          r.nameAr.toLowerCase().includes(q) ||
          r.slug.toLowerCase().includes(q),
      );
    }
    const copy = [...list];
    if (sortMode === "nameEn") copy.sort((a, b) => a.nameEn.localeCompare(b.nameEn));
    else if (sortMode === "nameAr") copy.sort((a, b) => a.nameAr.localeCompare(b.nameAr));
    else copy.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
    return copy;
  }, [rows, search, sortMode]);

  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  async function save(row: Cat) {
    const facetKeys = facetAttrsById[row.id] ?? [];
    if (facetKeys.length) {
      const v = validateFacetAttributesForSave(facetKeys);
      if (!v.ok) {
        setMsg(v.error);
        return;
      }
    }
    setSaving(row.id);
    setMsg("");
    const res = await fetch(`/api/admin/categories/${row.id}`, {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: row.nameEn,
        nameAr: row.nameAr,
        icon: "",
        color: row.color,
        backgroundImageUrl: row.backgroundImageUrl?.trim() ? row.backgroundImageUrl.trim() : null,
        sortOrder: row.sortOrder,
        facetKeys: facetKeys.length ? facetKeys : null,
      }),
    });
    setSaving(null);
    if (!res.ok) {
      const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
      setMsg(errBody?.error ? `فشل الحفظ: ${errBody.error}` : "فشل الحفظ");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["storefront-bootstrap"] });
    setMsg("تم الحفظ");
    void load();
  }

  function patchSelected(patch: Partial<DrawerCategory>) {
    if (selectedId == null) return;
    setRows((rs) => rs.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)));
  }

  async function saveSelected() {
    if (!selected) return;
    await save(selected);
    setSelectedId(null);
  }

  async function swapSortOrder(sourceId: number, targetId: number) {
    if (sourceId === targetId) return;
    const ra = rows.find((r) => r.id === sourceId);
    const rb = rows.find((r) => r.id === targetId);
    if (!ra || !rb) return;
    const na = { ...ra, sortOrder: rb.sortOrder };
    const nb = { ...rb, sortOrder: ra.sortOrder };
    setRows((rs) => rs.map((r) => (r.id === na.id ? na : r.id === nb.id ? nb : r)));
    setBulkSaving(true);
    setMsg("");
    const ok1 = await fetch(`/api/admin/categories/${na.id}`, {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: na.nameEn,
        nameAr: na.nameAr,
        icon: "",
        color: na.color,
        backgroundImageUrl: na.backgroundImageUrl?.trim() ? na.backgroundImageUrl.trim() : null,
        sortOrder: na.sortOrder,
        facetKeys: (facetAttrsById[na.id] ?? []).length ? facetAttrsById[na.id] : null,
      }),
    });
    const ok2 = await fetch(`/api/admin/categories/${nb.id}`, {
      method: "PATCH",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn: nb.nameEn,
        nameAr: nb.nameAr,
        icon: "",
        color: nb.color,
        backgroundImageUrl: nb.backgroundImageUrl?.trim() ? nb.backgroundImageUrl.trim() : null,
        sortOrder: nb.sortOrder,
        facetKeys: (facetAttrsById[nb.id] ?? []).length ? facetAttrsById[nb.id] : null,
      }),
    });
    setBulkSaving(false);
    if (!ok1.ok || !ok2.ok) {
      setMsg("فشل تحديث الترتيب");
      void load();
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["storefront-bootstrap"] });
    setMsg("تم تحديث الترتيب");
    void load();
  }

  return (
    <div className={clsx(styles.page, rtl && styles.pageRtl)}>
      <div className={styles.topBar}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>التصنيفات</h1>
          <p className={styles.subtitle}>
            بطاقات سريعة — انقر للتعديل. صورة الخلفية واللون والترتيب يظهران في المتجر وفي{" "}
            <strong>ميجا بلوكات</strong> الرئيسية (تلقائياً أو عبر{" "}
            <Link to="/admin/content" style={{ color: "#f87171" }}>
              محرّر الصفحة → قسم ميجا بلوكات
            </Link>
            ). (Tailwind غير مفعّل؛ تنسيقات CSS محلية.)
          </p>
        </div>
        <CategorySearchBar
          value={search}
          onChange={setSearch}
          placeholder="بحث بالاسم أو الـ slug…"
          aria-label="بحث التصنيفات"
        />
        <div className={styles.toolbarEnd}>
          <label className={styles.label} style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            <SlidersHorizontal size={14} aria-hidden />
            <select className={styles.select} value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)}>
              <option value="sortOrder">الترتيب المحفوظ</option>
              <option value="nameEn">الاسم EN</option>
              <option value="nameAr">الاسم AR</option>
            </select>
          </label>
          <button type="button" className={styles.btnPrimary} onClick={() => setCreateOpen(true)}>
            <Plus size={18} aria-hidden />
            إضافة تصنيف
          </button>
        </div>
      </div>

      {msg ? <div className={clsx(styles.msg, msg.includes("فشل") ? styles.msgErr : styles.msgOk)}>{msg}</div> : null}

      {loading ? (
        <div className={styles.skeletonGrid} aria-busy>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard} />
          ))}
        </div>
      ) : filteredSorted.length === 0 ? (
        <div className={styles.empty}>
          {rows.length === 0 ? "لا توجد تصنيفات بعد — أنشئ تصنيفاً جديداً." : "لا نتائج مطابقة للبحث."}
        </div>
      ) : (
        <CategoryGrid>
          {filteredSorted.map((r) => (
            <CategoryCard
              key={r.id}
              cat={r}
              facetAttributes={facetAttrsById[r.id] ?? []}
              catalogFieldTotal={CATALOG_FIELD_TOTAL}
              onOpen={() => {
                setDrawerBaselineAttrs([...(facetAttrsById[r.id] ?? [])]);
                setSelectedId(r.id);
              }}
              isDragging={draggingId === r.id}
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData("text/category-id", String(r.id));
                e.dataTransfer.effectAllowed = "move";
                setDraggingId(r.id);
              }}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                e.preventDefault();
                const sid = Number(e.dataTransfer.getData("text/category-id"));
                setDraggingId(null);
                if (Number.isFinite(sid) && sid !== r.id) void swapSortOrder(sid, r.id);
              }}
            />
          ))}
        </CategoryGrid>
      )}

      {bulkSaving ? <p style={{ fontSize: 12, color: "var(--admin-muted)" }}>جاري تحديث الترتيب…</p> : null}

      <CategoryDetailsDrawer
        open={selectedId != null}
        rtl={rtl}
        cat={selected}
        facetAttributes={selected ? facetAttrsById[selected.id] ?? [] : []}
        baselineFacetAttributes={drawerBaselineAttrs}
        onClose={() => setSelectedId(null)}
        onChangeCat={patchSelected}
        onFacetAttributesChange={(next) =>
          selectedId != null && setFacetAttrsById((prev) => ({ ...prev, [selectedId]: next }))
        }
        onSave={() => saveSelected()}
        savePending={selected != null && saving === selected.id}
        importCategoryOptions={importCategoryOptions}
      />

      <AddCategoryModal
        open={createOpen}
        rtl={rtl}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["storefront-bootstrap"] });
          void load();
        }}
        setMsg={setMsg}
        importCategoryOptions={importCategoryOptions}
      />
    </div>
  );
}
