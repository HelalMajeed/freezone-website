"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { uploadAdminImage } from "@/lib/admin-upload-image";
import { CATEGORY_PROMO_IMAGE_HINT_AR } from "@/lib/category-promo-image-spec";
import { resizeCategoryPromoImageFile } from "@/lib/resize-category-promo-image";
import { freezoneApiUrl } from "@/lib/api-internal";
import { FacetKeysPicker, type FacetImportCategoryOption } from "@/components/admin/FacetKeysPicker";
import { facetAttributesToOrderedSelection } from "@/components/admin/facet/facet-keys-utils";
import { validateFacetAttributesForSave } from "@/lib/facet-attributes";
import type { FacetAttributeDef } from "@/lib/data";
import { FieldItem } from "./FieldItem";
import styles from "./admin-categories.module.css";

type Props = {
  open: boolean;
  rtl: boolean;
  onClose: () => void;
  onCreated: () => void;
  setMsg: (s: string) => void;
  importCategoryOptions?: FacetImportCategoryOption[];
};

export function AddCategoryModal({ open, rtl, onClose, onCreated, setMsg, importCategoryOptions }: Props) {
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newBgUrl, setNewBgUrl] = useState("");
  const [newColor, setNewColor] = useState("#64748b");
  const [newFacetAttrs, setNewFacetAttrs] = useState<FacetAttributeDef[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNewNameAr("");
    setNewNameEn("");
    setNewSlug("");
    setNewBgUrl("");
    setNewColor("#64748b");
    setNewFacetAttrs([]);
  }, [open]);

  async function createCategory(e: FormEvent) {
    e.preventDefault();
    const nameEn = newNameEn.trim();
    const nameAr = newNameAr.trim() || nameEn;
    if (!nameEn) {
      setMsg("أدخل الاسم بالإنجليزية");
      return;
    }
    const facetKeys = newFacetAttrs.length ? newFacetAttrs : undefined;
    if (facetKeys) {
      const v = validateFacetAttributesForSave(facetKeys);
      if (!v.ok) {
        setMsg(v.error);
        return;
      }
    }
    setCreating(true);
    setMsg("");
    const res = await fetch(freezoneApiUrl("/api/admin/categories"), {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nameEn,
        nameAr,
        slug: newSlug.trim() || undefined,
        icon: "",
        color: newColor,
        backgroundImageUrl: newBgUrl.trim() || null,
        sortOrder: 999,
        facetKeys: facetKeys?.length ? facetKeys : undefined,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      setMsg("فشل إنشاء القسم — ربما تعارض في الـ slug");
      return;
    }
    setMsg("تم إنشاء القسم");
    onCreated();
    onClose();
  }

  const previewAttrs = facetAttributesToOrderedSelection(newFacetAttrs).slice(0, 6);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className={styles.modalOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="presentation"
        >
          <motion.div
            className={styles.modal}
            dir={rtl ? "rtl" : "ltr"}
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHead}>
              <h2 style={{ margin: 0, fontSize: "1.1rem" }}>قسم جديد</h2>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="إغلاق">
                ×
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={(ev) => void createCategory(ev)}>
              <div className={styles.fieldRow}>
                <div>
                  <div className={styles.label}>الاسم عربي</div>
                  <input className={styles.input} value={newNameAr} onChange={(e) => setNewNameAr(e.target.value)} placeholder="الاسم عربي *" />
                </div>
                <div>
                  <div className={styles.label}>Name EN *</div>
                  <input className={styles.input} value={newNameEn} onChange={(e) => setNewNameEn(e.target.value)} placeholder="Name EN *" required />
                </div>
              </div>
              <div>
                <div className={styles.label}>slug (اختياري)</div>
                <input dir="ltr" className={styles.input} value={newSlug} onChange={(e) => setNewSlug(e.target.value)} placeholder="slug" />
              </div>
              <div>
                <div className={styles.label}>صورة بطاقة الرئيسية (1200×800)</div>
                <p style={{ margin: "0 0 8px", fontSize: 12, color: "var(--admin-muted)" }}>{CATEGORY_PROMO_IMAGE_HINT_AR}</p>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <input
                    dir="ltr"
                    type="url"
                    className={styles.input}
                    style={{ flex: "1 1 200px" }}
                    placeholder="https://…"
                    value={newBgUrl}
                    onChange={(e) => setNewBgUrl(e.target.value)}
                  />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    style={{ fontSize: 13 }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (!f) return;
                      try {
                        const resized = await resizeCategoryPromoImageFile(f);
                        setNewBgUrl(await uploadAdminImage(resized));
                      } catch {
                        setMsg("فشل رفع صورة الخلفية");
                      }
                    }}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className={styles.label} style={{ margin: 0 }}>
                  لون البطاقة
                </span>
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} style={{ height: 36, border: "none" }} />
              </div>
              {previewAttrs.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--admin-muted)" }}>معاينة الحقول المختارة</span>
                  {previewAttrs.map((a) => (
                    <FieldItem
                      key={a.key}
                      nameAr={`${a.name_ar} / ${a.name_en}`}
                      specKey={a.key}
                      showReorder={false}
                      onRemove={() => setNewFacetAttrs((prev) => prev.filter((x) => x.key !== a.key))}
                    />
                  ))}
                </div>
              ) : null}
              <FacetKeysPicker
                value={newFacetAttrs}
                onChange={setNewFacetAttrs}
                compact
                manualOnly
                importCategoryOptions={importCategoryOptions}
              />
              <button type="submit" disabled={creating} className={styles.btnPrimary} style={{ alignSelf: "flex-start" }}>
                {creating ? "…" : "إنشاء القسم"}
              </button>
            </form>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
