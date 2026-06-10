/**
 * Categories — tree-ordered list with attribute-schema health badges and a
 * deep link into the per-category attribute & filter builder. Reads the
 * GlobalSearch `?search=` seed from the URL.
 */
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderTree, Plus, SlidersHorizontal } from "lucide-react";
import { dashboardApi, DashboardApiError, type CategoryFull } from "@/lib/dashboard/api";
import {
  Badge,
  Button,
  Card,
  Input,
  Table,
  useConfirm,
  useToast,
} from "@/components/dashboard/ui";
import { useDashboardLocale, type DashboardLang } from "@/lib/dashboard/i18n";
import { resolveUploadUrl } from "./products/shared";
import { CategoryFormModal } from "./categories/CategoryFormModal";
import s from "./products.module.css";

/**
 * Sort categories so parents precede children, then by sortOrder/name.
 * Returns flat list with a `depth` annotation for indentation.
 */
function buildTree(rows: CategoryFull[], lang: DashboardLang): Array<CategoryFull & { depth: number }> {
  const byParent = new Map<number | null, CategoryFull[]>();
  for (const c of rows) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  for (const list of byParent.values()) {
    list.sort(
      (a, b) =>
        a.sortOrder - b.sortOrder ||
        (lang === "ar" ? a.nameAr || a.nameEn : a.nameEn).localeCompare(
          lang === "ar" ? b.nameAr || b.nameEn : b.nameEn,
        ),
    );
  }
  const result: Array<CategoryFull & { depth: number }> = [];
  const walk = (parentId: number | null, depth: number) => {
    const list = byParent.get(parentId) ?? [];
    for (const c of list) {
      result.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  // Catch any orphans (parentId points at a missing row).
  const seenIds = new Set(result.map((c) => c.id));
  for (const c of rows) {
    if (!seenIds.has(c.id)) result.push({ ...c, depth: 0 });
  }
  return result;
}

export function DashboardCategoriesPage() {
  const { t, lang, formatError } = useDashboardLocale();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [rows, setRows] = useState<CategoryFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const search = searchParams.get("search") ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryFull | null>(null);

  const load = () => {
    setLoading(true);
    dashboardApi
      .get<CategoryFull[]>("/api/admin/categories")
      .then((d) => {
        setRows(d);
        setErr(null);
      })
      .catch((e) => setErr(formatError(e)))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  useEffect(load, []);

  const tree = useMemo(() => buildTree(rows, lang), [rows, lang]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tree;
    return tree.filter(
      (c) =>
        c.nameEn.toLowerCase().includes(q) ||
        c.nameAr.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q),
    );
  }, [tree, search]);

  const setSearch = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("search", value);
        else next.delete("search");
        return next;
      },
      { replace: true },
    );
  };

  const catName = (c: CategoryFull) => (lang === "ar" ? c.nameAr || c.nameEn : c.nameEn);

  const onToggleActive = async (c: CategoryFull) => {
    try {
      await dashboardApi.patch(`/api/admin/categories/${c.id}`, { active: !c.active });
      toast.success(c.active ? t("categories.disabledToast") : t("categories.enabledToast"));
      load();
    } catch (e) {
      toast.error(formatError(e));
    }
  };

  const onDelete = async (c: CategoryFull) => {
    if (c.primaryProductCount > 0) {
      toast.error(t("categories.deleteBlocked", { count: c.primaryProductCount }));
      return;
    }
    const ok = await confirm({
      title: t("categories.deleteTitle"),
      message: t("categories.deleteMessage", { name: catName(c) }),
      confirmLabel: t("confirm.delete"),
      tone: "danger",
    });
    if (!ok) return;
    try {
      await dashboardApi.delete(`/api/admin/categories/${c.id}`);
      toast.success(t("categories.deletedToast"));
      load();
    } catch (e) {
      if (e instanceof DashboardApiError) {
        const extra = (e.extra as { productCount?: number } | undefined) ?? {};
        if (extra.productCount && extra.productCount > 0) {
          toast.error(t("categories.deleteBlocked", { count: extra.productCount }));
          return;
        }
      }
      toast.error(formatError(e));
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">{t("categories.title")}</h1>
          <div className="dashboard-page-subtitle">{t("categories.subtitle")}</div>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <Plus size={15} aria-hidden /> {t("categories.new")}
        </Button>
      </div>

      <Card tight>
        <div className={s.searchBar}>
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("categories.searchPlaceholder")}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div className={s.errorBox}>{err}</div>
        ) : (
          <Table
            rowKey={(c) => c.id}
            rows={filtered}
            empty={rows.length === 0 ? t("categories.empty") : t("categories.emptyFiltered")}
            columns={[
              {
                header: t("categories.colCategory"),
                cell: (c) => (
                  <div className={s.treeCell} style={{ paddingInlineStart: c.depth * 18 }}>
                    <span
                      className={s.catThumb}
                      style={{ background: c.color || "var(--fz-bg-soft)" }}
                    >
                      {c.backgroundImageUrl ? (
                        <img src={resolveUploadUrl(c.backgroundImageUrl)} alt="" />
                      ) : (
                        c.icon || <FolderTree size={16} aria-hidden />
                      )}
                    </span>
                    <div>
                      <div className={s.cellTitle}>{catName(c)}</div>
                      <div className={s.cellSub}>/{c.slug}</div>
                    </div>
                  </div>
                ),
              },
              {
                header: t("categories.colProducts"),
                width: "120px",
                cell: (c) => (
                  <div className={s.countCell}>
                    <span className={s.countMain}>{c.primaryProductCount}</span>
                    {c.secondaryLinkCount > 0 && (
                      <span className={s.cellSub}>
                        {t("categories.secondaryCount", { count: c.secondaryLinkCount })}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: t("categories.colAttributes"),
                width: "150px",
                cell: (c) =>
                  (c.categoryAttributes?.length ?? 0) > 0 ? (
                    <Badge tone="info">
                      {t("categories.attrCount", { count: c.categoryAttributes.length })}
                    </Badge>
                  ) : (
                    <Badge tone="warning">{t("categories.noAttrs")}</Badge>
                  ),
              },
              {
                header: t("categories.colSort"),
                width: "80px",
                align: "end",
                mono: true,
                cell: (c) => <span className={s.cellSoft}>{c.sortOrder}</span>,
              },
              {
                header: t("categories.colStatus"),
                width: "100px",
                cell: (c) =>
                  c.active ? (
                    <Badge tone="success">{t("categories.active")}</Badge>
                  ) : (
                    <Badge tone="neutral">{t("categories.disabled")}</Badge>
                  ),
              },
              {
                header: "",
                cell: (c) => (
                  <div className={s.rowActions}>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate(`/admin/categories/${c.id}/attributes`)}
                    >
                      <SlidersHorizontal size={13} aria-hidden /> {t("categories.attributes")}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void onToggleActive(c)}>
                      {c.active ? t("categories.disable") : t("categories.enable")}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(c);
                        setModalOpen(true);
                      }}
                    >
                      {t("common.edit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={t("common.delete")}
                      onClick={() => void onDelete(c)}
                    >
                      ✕
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>

      <CategoryFormModal
        open={modalOpen}
        category={editing}
        allCategories={rows}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          toast.success(t("catForm.savedToast"));
          load();
        }}
      />
    </>
  );
}

export default DashboardCategoriesPage;
