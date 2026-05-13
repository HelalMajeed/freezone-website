import { useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { apiJson } from "../lib/api";
import type { SubService } from "../lib/types";
import { setAdminLanguage } from "../i18n/i18n";

type TabFilter = "all" | "offers";

function serviceName(row: SubService, lng: string) {
  return lng.startsWith("ar") ? row.nameAr : row.nameEn;
}

export function OffersAdminPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("all");
  const queryKey = ["sub-services", tab] as const;

  const query = useQuery({
    queryKey,
    queryFn: () =>
      apiJson<SubService[]>(`/admin/sub-services${tab === "offers" ? "?filter=offers" : ""}`),
  });

  const rows = query.data ?? [];

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Partial<Pick<SubService, "isOffer" | "sortOrder" | "active">>;
    }) => {
      return apiJson<SubService>(`/admin/sub-services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    },
    onMutate: async ({ id, body }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubService[]>(queryKey);
      if (!prev) return { prev: undefined as SubService[] | undefined };
      qc.setQueryData(
        queryKey,
        prev.map((r) => (r.id === id ? { ...r, ...body } : r)),
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(t("offers.loadError"));
    },
    onSuccess: () => {
      toast.success(t("offers.toastSaved"));
      void qc.invalidateQueries({ queryKey: ["sub-services"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) =>
      apiJson<SubService[]>(`/admin/sub-services/reorder/batch`, {
        method: "PATCH",
        body: JSON.stringify({ orderedIds }),
      }),
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<SubService[]>(queryKey);
      const map = new Map((prev ?? []).map((r) => [r.id, r]));
      const next = orderedIds.map((id) => map.get(id)).filter((x): x is SubService => Boolean(x));
      qc.setQueryData(queryKey, next);
      return { prev };
    },
    onError: (_e, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(t("offers.toastOrderError"));
    },
    onSuccess: () => {
      toast.success(t("offers.toastOrderSaved"));
      void qc.invalidateQueries({ queryKey: ["sub-services"] });
    },
  });

  const reorderByOrderedRows = (next: SubService[]) => {
    reorderMutation.mutate(next.map((r) => r.id));
  };

  const onDropRow = (targetId: string, e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) return;
    const list = [...rows];
    const from = list.findIndex((r) => r.id === draggedId);
    const to = list.findIndex((r) => r.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = list.splice(from, 1);
    if (!moved) return;
    list.splice(to, 0, moved);
    reorderByOrderedRows(list);
  };

  const move = (index: number, dir: -1 | 1) => {
    const j = index + dir;
    if (j < 0 || j >= rows.length) return;
    const copy = [...rows];
    const tmp = copy[index];
    const other = copy[j];
    if (!tmp || !other) return;
    copy[index] = other;
    copy[j] = tmp;
    reorderByOrderedRows(copy);
  };

  const loading = query.isPending;
  const err = query.isError;

  return (
    <div className="min-h-screen flex-1 bg-slate-50 p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{t("offers.title")}</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border bg-white px-3 py-1 text-sm shadow-sm"
              onClick={() => void query.refetch()}
              disabled={loading}
            >
              {t("offers.reload")}
            </button>
            <button type="button" className="rounded border bg-white px-3 py-1 text-sm shadow-sm" onClick={() => setAdminLanguage("en")}>
              {t("offers.langEn")}
            </button>
            <button type="button" className="rounded border bg-white px-3 py-1 text-sm shadow-sm" onClick={() => setAdminLanguage("ar")}>
              {t("offers.langAr")}
            </button>
          </div>
        </header>

        <div className="flex gap-2 rounded-lg border bg-white p-1 shadow-sm">
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "all" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setTab("all")}
          >
            {t("offers.tabs.all")}
          </button>
          <button
            type="button"
            className={`rounded-md px-4 py-2 text-sm font-medium ${tab === "offers" ? "bg-slate-900 text-white" : "text-slate-600"}`}
            onClick={() => setTab("offers")}
          >
            {t("offers.tabs.offersOnly")}
          </button>
        </div>

        {loading && <div className="rounded-lg border bg-white p-8 text-center text-slate-500">Loading…</div>}

        {err && !loading && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-6 text-red-800">
            <p>{t("offers.loadError")}</p>
            <button type="button" className="rounded bg-red-900 px-4 py-2 text-sm text-white" onClick={() => void query.refetch()}>
              {t("offers.retry")}
            </button>
          </div>
        )}

        {!loading && !err && rows.length === 0 && (
          <div className="rounded-lg border bg-white p-8 text-center text-slate-600">{t("offers.tableEmpty")}</div>
        )}

        {!loading && !err && rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2">{t("offers.colName")}</th>
                  <th className="px-3 py-2">{t("offers.colOffer")}</th>
                  <th className="px-3 py-2">{t("offers.colOrder")}</th>
                  <th className="px-3 py-2">{t("offers.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", row.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => onDropRow(row.id, e)}
                    className="border-t border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-3 py-2">{serviceName(row, i18n.language)}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.isOffer}
                        onChange={(e) => {
                          const isOffer = e.target.checked;
                          patchMutation.mutate({ id: row.id, body: { isOffer } });
                        }}
                        aria-label={t("offers.colOffer")}
                      />
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700">{row.sortOrder}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || reorderMutation.isPending}
                          aria-label={t("offers.moveUp")}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => move(index, 1)}
                          disabled={index === rows.length - 1 || reorderMutation.isPending}
                          aria-label={t("offers.moveDown")}
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
