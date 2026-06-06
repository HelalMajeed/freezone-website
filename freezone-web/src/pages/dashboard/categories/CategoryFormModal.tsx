/**
 * Category create/edit modal — bilingual fields, parent picker (cycle-safe),
 * icon/color/background image.
 */
import { useEffect, useRef, useState } from "react";
import {
  dashboardApi,
  DashboardApiError,
  uploadDashboardFile,
  type CategoryCreatePayload,
  type CategoryFull,
  type CategoryUpdatePayload,
} from "@/lib/dashboard/api";
import { Button, Field, Input, Modal, Select } from "@/components/dashboard/ui";
import { useDashboardLocale } from "@/lib/dashboard/i18n";
import { isRawApiMessage, resolveUploadUrl } from "../products/shared";
import s from "./category-form.module.css";

type FormState = {
  nameEn: string;
  nameAr: string;
  slug: string;
  parentId: string;
  icon: string;
  color: string;
  backgroundImageUrl: string;
  sortOrder: string;
  active: boolean;
};

const EMPTY: FormState = {
  nameEn: "",
  nameAr: "",
  slug: "",
  parentId: "",
  icon: "",
  color: "#64748b",
  backgroundImageUrl: "",
  sortOrder: "999",
  active: true,
};

function fromRow(c: CategoryFull): FormState {
  return {
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    slug: c.slug,
    parentId: c.parentId != null ? String(c.parentId) : "",
    icon: c.icon ?? "",
    color: c.color || "#64748b",
    backgroundImageUrl: c.backgroundImageUrl ?? "",
    sortOrder: String(c.sortOrder ?? 999),
    active: c.active,
  };
}

export function CategoryFormModal({
  open,
  category,
  allCategories,
  onClose,
  onSaved,
}: {
  open: boolean;
  /** null = create. */
  category: CategoryFull | null;
  /** Used to populate parent dropdown — excludes self + self-descendants on edit. */
  allCategories: CategoryFull[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t, lang, formatError } = useDashboardLocale();
  const editing = category != null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setForm(category ? fromRow(category) : EMPTY);
  }, [open, category]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const showError = (e: unknown) => {
    if (e instanceof DashboardApiError && isRawApiMessage(e.code)) setErr(e.code);
    else setErr(formatError(e));
  };

  const onPickBackground = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr(t("catForm.pickImage"));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErr(t("catForm.maxSize"));
      return;
    }
    setErr(null);
    setUploading(true);
    try {
      const { url } = await uploadDashboardFile(file, {
        register: true,
        title: form.nameEn || "Category background",
      });
      update("backgroundImageUrl", url);
    } catch (e) {
      showError(e);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setErr(null);
    const nameEn = form.nameEn.trim();
    const nameAr = form.nameAr.trim() || nameEn;
    if (!nameEn) {
      setErr(t("catForm.nameRequired"));
      return;
    }
    const sortOrderNum = Number(form.sortOrder);
    const sortOrder = Number.isFinite(sortOrderNum) ? sortOrderNum : 999;
    const parentId = form.parentId ? Number(form.parentId) : null;
    const backgroundImageUrl = form.backgroundImageUrl.trim() || null;

    setSaving(true);
    try {
      if (editing && category) {
        const payload: CategoryUpdatePayload = {
          nameEn,
          nameAr,
          slug: form.slug.trim() || undefined,
          parentId,
          icon: form.icon,
          color: form.color || "#64748b",
          backgroundImageUrl,
          sortOrder,
          active: form.active,
        };
        await dashboardApi.patch(`/api/admin/categories/${category.id}`, payload);
      } else {
        const payload: CategoryCreatePayload = {
          nameEn,
          nameAr,
          slug: form.slug.trim() || undefined,
          parentId,
          icon: form.icon || undefined,
          color: form.color || undefined,
          backgroundImageUrl,
          sortOrder,
          active: form.active,
        };
        await dashboardApi.post("/api/admin/categories", payload);
      }
      onSaved();
    } catch (e) {
      showError(e);
    } finally {
      setSaving(false);
    }
  };

  // Collect ids of `category` and all its descendants to exclude from parent options.
  const blockedIds = (() => {
    if (!category) return new Set<number>();
    const blocked = new Set<number>([category.id]);
    let added = true;
    while (added) {
      added = false;
      for (const c of allCategories) {
        if (c.parentId != null && blocked.has(c.parentId) && !blocked.has(c.id)) {
          blocked.add(c.id);
          added = true;
        }
      }
    }
    return blocked;
  })();

  const parentOptions = [
    { value: "", label: t("catForm.noParent") },
    ...allCategories
      .filter((c) => !blockedIds.has(c.id))
      .sort((a, b) =>
        (lang === "ar" ? a.nameAr || a.nameEn : a.nameEn).localeCompare(
          lang === "ar" ? b.nameAr || b.nameEn : b.nameEn,
        ),
      )
      .map((c) => ({
        value: String(c.id),
        label: lang === "ar" ? c.nameAr || c.nameEn : c.nameEn,
      })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t("catForm.titleEdit") : t("catForm.titleNew")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} loading={saving}>
            {t("common.save")}
          </Button>
        </>
      }
    >
      <div className={s.form}>
        {err && <div className={s.errorBox}>{err}</div>}

        <div className={s.grid2}>
          <Field label={t("catForm.nameEn")} required hint={t("common.required")}>
            <Input
              value={form.nameEn}
              onChange={(e) => update("nameEn", e.target.value)}
              placeholder="Laptops"
            />
          </Field>
          <Field label={t("catForm.nameAr")} hint={t("common.optional")}>
            <Input
              value={form.nameAr}
              dir="rtl"
              onChange={(e) => update("nameAr", e.target.value)}
              placeholder="لابتوبات"
            />
          </Field>
        </div>

        <Field label={t("catForm.slug")} hint={t("catForm.slugHint")}>
          <Input
            value={form.slug}
            dir="ltr"
            onChange={(e) => update("slug", e.target.value)}
            placeholder="laptops"
          />
        </Field>

        <Field label={t("catForm.parent")}>
          <Select
            value={form.parentId}
            onChange={(e) => update("parentId", (e.target as HTMLSelectElement).value)}
            options={parentOptions}
          />
        </Field>

        <div className={s.grid3}>
          <Field label={t("catForm.icon")} hint={t("catForm.iconHint")}>
            <Input
              value={form.icon}
              onChange={(e) => update("icon", e.target.value)}
              placeholder="💻"
            />
          </Field>
          <Field label={t("catForm.color")}>
            <div className={s.colorRow}>
              <input
                type="color"
                className={s.colorSwatch}
                value={form.color}
                onChange={(e) => update("color", e.target.value)}
                aria-label={t("catForm.color")}
              />
              <Input
                value={form.color}
                dir="ltr"
                onChange={(e) => update("color", e.target.value)}
                placeholder="#64748b"
              />
            </div>
          </Field>
          <Field label={t("catForm.sortOrder")}>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) => update("sortOrder", e.target.value)}
            />
          </Field>
        </div>

        <Field label={t("catForm.background")}>
          <div className={s.backgroundRow}>
            <span className={s.thumb} style={{ background: form.color || "var(--fz-bg-soft)" }}>
              {form.backgroundImageUrl ? (
                <img src={resolveUploadUrl(form.backgroundImageUrl)} alt="" />
              ) : (
                form.icon || "📦"
              )}
            </span>
            <div className={s.backgroundControls}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className={s.hiddenInput}
                onChange={(e) => void onPickBackground(e.target.files?.[0])}
              />
              <div className={s.backgroundButtons}>
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {form.backgroundImageUrl ? t("catForm.replace") : t("catForm.upload")}
                </Button>
                {form.backgroundImageUrl && (
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => update("backgroundImageUrl", "")}
                  >
                    {t("common.remove")}
                  </Button>
                )}
              </div>
              <Input
                value={form.backgroundImageUrl}
                onChange={(e) => update("backgroundImageUrl", e.target.value)}
                placeholder={t("catForm.pasteUrl")}
              />
            </div>
          </div>
        </Field>

        <label className={s.activeRow}>
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update("active", e.target.checked)}
          />
          <span>{t("catForm.activeLabel")}</span>
        </label>
      </div>
    </Modal>
  );
}
