"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/providers/i18n-provider";
import { CategoryDrawer } from "./category-drawer";
import { CategoryTree } from "./category-tree";
import type { CategoryFlat } from "./types";
import { buildTree, flattenReorderPayload } from "./tree-utils";

type CategoriesResponse = { flat: CategoryFlat[] };

async function fetchCategories(): Promise<CategoriesResponse> {
  return apiJson<CategoriesResponse>("/categories?format=flat");
}

export function CategoryWorkspace() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const flat = q.data?.flat ?? [];
  const tree = useMemo(() => buildTree(flat), [flat]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<string | null>(null);

  const editing = useMemo(() => flat.find((c) => c.id === editId) ?? null, [flat, editId]);

  const reorderMut = useMutation({
    mutationFn: async (nextFlat: CategoryFlat[]) => {
      return apiJson<{ flat: CategoryFlat[] }>("/categories/reorder/batch", {
        method: "PATCH",
        body: JSON.stringify({ items: flattenReorderPayload(nextFlat) }),
      });
    },
    onMutate: async (nextFlat) => {
      await qc.cancelQueries({ queryKey: ["categories"] });
      const prev = qc.getQueryData<CategoriesResponse>(["categories"]);
      qc.setQueryData(["categories"], { flat: nextFlat });
      return { prev };
    },
    onError: (err, _nf, ctx) => {
      if (ctx?.prev) qc.setQueryData(["categories"], ctx.prev);
      toast.error(err instanceof ApiError ? err.body : String(err));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["categories"] }),
  });

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      return apiJson("/categories/bulk-delete", {
        method: "POST",
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: async () => {
      setSelected(new Set());
      await qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Deleted");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.body : String(err)),
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const expandAll = () => {
    const ids = new Set(flat.filter((c) => flat.some((x) => x.parentId === c.id)).map((c) => c.id));
    setExpanded(ids);
  };

  const collapseAll = () => setExpanded(new Set());

  const openCreate = () => {
    setDrawerMode("create");
    setEditId(null);
    setDrawerOpen(true);
  };

  const openEdit = (id: string) => {
    setDrawerMode("edit");
    setEditId(id);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#061c34]">{t("categories.title")}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted">{t("categories.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" type="button" onClick={expandAll}>
            {t("categories.expandAll")}
          </Button>
          <Button variant="secondary" size="sm" type="button" onClick={collapseAll}>
            {t("categories.collapseAll")}
          </Button>
          <Button variant="destructive" size="sm" type="button" disabled={!selected.size || bulkDeleteMut.isPending} onClick={() => bulkDeleteMut.mutate([...selected])}>
            {t("categories.bulkDelete")} ({selected.size})
          </Button>
          <Button size="sm" type="button" onClick={openCreate}>
            {t("categories.add")}
          </Button>
        </div>
      </div>

      {q.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-3/4" />
        </div>
      )}

      {q.isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load categories. Is the API running at {process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3020/v1"}?
        </div>
      )}

      {!q.isLoading && !flat.length && <p className="text-sm text-muted">{t("categories.empty")}</p>}

      {!q.isLoading && !!flat.length && (
        <CategoryTree
          tree={tree}
          flat={flat}
          expanded={expanded}
          setExpanded={setExpanded}
          selectedIds={selected}
          toggleSelect={toggleSelect}
          onEdit={openEdit}
          onReorder={(nf) => reorderMut.mutate(nf)}
        />
      )}

      <CategoryDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        mode={drawerMode}
        category={editing}
        flat={flat}
      />
    </div>
  );
}
