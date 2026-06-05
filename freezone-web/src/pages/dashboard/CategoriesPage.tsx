import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  dashboardApi,
  DashboardApiError,
  type CategoryFull,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  Badge,
  Button,
  Card,
  Input,
  Table,
} from "@/components/dashboard/ui";
import { CategoryFormModal } from "./categories/CategoryFormModal";

type Lang = "ar" | "en";

function resolveImage(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

/**
 * Sort categories so parents precede children, then by sortOrder/name.
 * Returns flat list with a `depth` annotation for indentation.
 */
function buildTree(rows: CategoryFull[], lang: Lang): Array<CategoryFull & { depth: number }> {
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
  const { i18n } = useTranslation();
  const lang = ((i18n.resolvedLanguage ?? "en").startsWith("ar") ? "ar" : "en") as Lang;

  const [rows, setRows] = useState<CategoryFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
      .catch((e) =>
        setErr(e instanceof DashboardApiError ? e.code : (e as Error).message),
      )
      .finally(() => setLoading(false));
  };

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

  const onCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const onEdit = (c: CategoryFull) => {
    setEditing(c);
    setModalOpen(true);
  };

  const onToggleActive = async (c: CategoryFull) => {
    try {
      await dashboardApi.patch(`/api/admin/categories/${c.id}`, { active: !c.active });
      load();
    } catch (e) {
      setErr(e instanceof DashboardApiError ? e.code : (e as Error).message);
    }
  };

  const onDelete = async (c: CategoryFull) => {
    if (c.primaryProductCount > 0) {
      window.alert(
        lang === "ar"
          ? `لا يمكن حذف هذا القسم — ${c.primaryProductCount} منتج مرتبط به. عطّله بدلاً من الحذف.`
          : `Can't delete — ${c.primaryProductCount} product(s) reference this category. Disable it instead.`,
      );
      return;
    }
    const sure = window.confirm(
      lang === "ar"
        ? `حذف "${c.nameAr || c.nameEn}"؟ لا يمكن التراجع.`
        : `Delete "${c.nameEn}"? This can't be undone.`,
    );
    if (!sure) return;
    try {
      await dashboardApi.delete(`/api/admin/categories/${c.id}`);
      load();
    } catch (e) {
      if (e instanceof DashboardApiError) {
        const extra = (e.extra as { productCount?: number } | undefined) ?? {};
        if (extra.productCount && extra.productCount > 0) {
          window.alert(
            lang === "ar"
              ? `لا يمكن الحذف — ${extra.productCount} منتج مرتبط.`
              : `Can't delete — ${extra.productCount} linked product(s).`,
          );
        } else {
          setErr(e.code);
        }
      } else {
        setErr((e as Error).message);
      }
    }
  };

  return (
    <>
      <div className="dashboard-page-header">
        <div>
          <h1 className="dashboard-page-title">
            {lang === "ar" ? "الأقسام" : "Categories"}
          </h1>
          <div className="dashboard-page-subtitle">
            {lang === "ar"
              ? "أنشئ شجرة الأقسام، وحدّث ترتيبها، أيقوناتها، ألوانها وصور خلفياتها."
              : "Build the category tree, set ordering, icons, colors, and background images."}
          </div>
        </div>
        <Button onClick={onCreate}>
          + {lang === "ar" ? "قسم جديد" : "New category"}
        </Button>
      </div>

      <Card tight>
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--fz-border, #e5e7eb)",
          }}
        >
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={lang === "ar" ? "ابحث بالاسم أو الـ slug…" : "Search by name or slug…"}
          />
        </div>

        {loading ? (
          <div className="dashboard-loader" />
        ) : err ? (
          <div style={{ padding: 20, color: "var(--fz-danger)" }}>{err}</div>
        ) : (
          <Table
            rowKey={(c) => c.id}
            rows={filtered}
            empty={
              rows.length === 0
                ? lang === "ar"
                  ? "لا توجد أقسام بعد. أنشئ أول قسم."
                  : "No categories yet. Create your first one."
                : lang === "ar"
                  ? "لا نتائج مطابقة."
                  : "No matches."
            }
            columns={[
              {
                header: lang === "ar" ? "القسم" : "Category",
                cell: (c) => (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      paddingInlineStart: c.depth * 18,
                    }}
                  >
                    <CategoryThumb url={c.backgroundImageUrl} icon={c.icon} color={c.color} />
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {lang === "ar" ? c.nameAr || c.nameEn : c.nameEn}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--fz-text-muted)" }}>
                        /{c.slug}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "المنتجات" : "Products",
                width: "120px",
                cell: (c) => (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{c.primaryProductCount}</span>
                    {c.secondaryLinkCount > 0 && (
                      <span style={{ fontSize: 11, color: "var(--fz-text-muted)" }}>
                        + {c.secondaryLinkCount}{" "}
                        {lang === "ar" ? "ثانوي" : "secondary"}
                      </span>
                    )}
                  </div>
                ),
              },
              {
                header: lang === "ar" ? "الترتيب" : "Sort",
                width: "80px",
                cell: (c) => (
                  <span style={{ color: "var(--fz-text-soft)" }}>{c.sortOrder}</span>
                ),
              },
              {
                header: lang === "ar" ? "الحالة" : "Status",
                width: "100px",
                cell: (c) =>
                  c.active ? (
                    <Badge tone="success">{lang === "ar" ? "نشط" : "Active"}</Badge>
                  ) : (
                    <Badge tone="neutral">{lang === "ar" ? "معطّل" : "Disabled"}</Badge>
                  ),
              },
              {
                header: "",
                cell: (c) => (
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Button size="sm" variant="secondary" onClick={() => onToggleActive(c)}>
                      {c.active
                        ? lang === "ar" ? "تعطيل" : "Disable"
                        : lang === "ar" ? "تفعيل" : "Enable"}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => onEdit(c)}>
                      {lang === "ar" ? "تعديل" : "Edit"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onDelete(c)}>
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
        lang={lang}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          setModalOpen(false);
          load();
        }}
      />
    </>
  );
}

function CategoryThumb({
  url,
  icon,
  color,
}: {
  url: string | null;
  icon: string;
  color: string;
}) {
  const src = resolveImage(url);
  return (
    <span
      style={{
        display: "inline-flex",
        width: 40,
        height: 40,
        borderRadius: 10,
        overflow: "hidden",
        background: color || "var(--fz-bg-soft, #f1f5f9)",
        color: "#fff",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        border: "1px solid var(--fz-border, #e5e7eb)",
        flexShrink: 0,
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        icon || "📦"
      )}
    </span>
  );
}

export default DashboardCategoriesPage;
