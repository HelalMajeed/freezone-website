"use client";

import { useState, type DragEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { commerceJson } from "@/lib/commerce-api";
import type { SubService } from "@/lib/commerce-types";
import i18n from "@/i18n/i18n";

type TabFilter = "all" | "offers";

function serviceName(row: SubService, lng: string) {
  return lng.startsWith("ar") ? row.nameAr : row.nameEn;
}

export default function AdminOffersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabFilter>("all");
  const queryKey = ["sub-services", tab] as const;

  const query = useQuery({
    queryKey,
    queryFn: () =>
      commerceJson<SubService[]>(`/admin/sub-services${tab === "offers" ? "?filter=offers" : ""}`),
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
      return commerceJson<SubService>(`/admin/sub-services/${id}`, {
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
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("AdminOffers.loadError"));
    },
    onSuccess: () => {
      toast.success(t("AdminOffers.toastSaved"));
      void qc.invalidateQueries({ queryKey: ["sub-services"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) =>
      commerceJson<SubService[]>(`/admin/sub-services/reorder/batch`, {
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
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : t("AdminOffers.toastOrderError"));
    },
    onSuccess: () => {
      toast.success(t("AdminOffers.toastOrderSaved"));
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
  const lng = i18n.language;

  const surface: React.CSSProperties = {
    padding: 24,
    maxWidth: 960,
    color: "var(--admin-text)",
  };

  const btn: React.CSSProperties = {
    borderRadius: 8,
    border: "1px solid var(--admin-outline-variant)",
    background: "var(--admin-surface)",
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
    color: "var(--admin-text)",
  };

  const tabOn: React.CSSProperties = {
    ...btn,
    background: "var(--admin-accent)",
    color: "var(--admin-on-accent)",
    borderColor: "var(--admin-accent)",
    fontWeight: 600,
  };

  return (
    <div style={surface}>
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem" }}>{t("AdminOffers.title")}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <button type="button" style={btn} onClick={() => void query.refetch()} disabled={loading}>
            {t("AdminOffers.reload")}
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => {
              void i18n.changeLanguage("en");
              document.documentElement.lang = "en";
              document.documentElement.dir = "ltr";
            }}
          >
            {t("AdminOffers.langEn")}
          </button>
          <button
            type="button"
            style={btn}
            onClick={() => {
              void i18n.changeLanguage("ar");
              document.documentElement.lang = "ar";
              document.documentElement.dir = "rtl";
            }}
          >
            {t("AdminOffers.langAr")}
          </button>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          padding: 6,
          borderRadius: 10,
          border: "1px solid var(--admin-outline-variant)",
          background: "var(--admin-surface-inset)",
          width: "fit-content",
        }}
      >
        <button type="button" style={tab === "all" ? tabOn : btn} onClick={() => setTab("all")}>
          {t("AdminOffers.tabs.all")}
        </button>
        <button type="button" style={tab === "offers" ? tabOn : btn} onClick={() => setTab("offers")}>
          {t("AdminOffers.tabs.offersOnly")}
        </button>
      </div>

      {loading && (
        <div style={{ padding: 48, textAlign: "center", color: "var(--admin-muted)", borderRadius: 12, border: "1px solid var(--admin-outline-variant)" }}>
          …
        </div>
      )}

      {err && !loading && (
        <div
          style={{
            padding: 24,
            borderRadius: 12,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            color: "#991b1b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <p style={{ margin: 0 }}>{t("AdminOffers.loadError")}</p>
          <button type="button" style={{ ...btn, background: "#991b1b", color: "#fff", borderColor: "#991b1b" }} onClick={() => void query.refetch()}>
            {t("AdminOffers.retry")}
          </button>
        </div>
      )}

      {!loading && !err && rows.length === 0 && (
        <div style={{ padding: 32, textAlign: "center", color: "var(--admin-muted)", borderRadius: 12, border: "1px solid var(--admin-outline-variant)" }}>
          {t("AdminOffers.tableEmpty")}
        </div>
      )}

      {!loading && !err && rows.length > 0 && (
        <div style={{ overflow: "auto", borderRadius: 12, border: "1px solid var(--admin-outline-variant)", background: "var(--admin-surface)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "var(--admin-surface-inset)", color: "var(--admin-muted)", textAlign: "start" }}>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>{t("AdminOffers.colName")}</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>{t("AdminOffers.colOffer")}</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>{t("AdminOffers.colActive")}</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>{t("AdminOffers.colOrder")}</th>
                <th style={{ padding: "10px 12px", fontWeight: 700 }}>{t("AdminOffers.actions")}</th>
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
                  style={{ borderTop: "1px solid var(--admin-outline-variant)" }}
                >
                  <td style={{ padding: "10px 12px" }}>{serviceName(row, lng)}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <input
                      type="checkbox"
                      checked={row.isOffer}
                      onChange={(e) => {
                        patchMutation.mutate({ id: row.id, body: { isOffer: e.target.checked } });
                      }}
                      aria-label={t("AdminOffers.colOffer")}
                    />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <input
                      type="checkbox"
                      checked={row.active}
                      onChange={(e) => {
                        patchMutation.mutate({ id: row.id, body: { active: e.target.checked } });
                      }}
                      aria-label={t("AdminOffers.colActive")}
                    />
                  </td>
                  <td style={{ padding: "10px 12px", fontFamily: "ui-monospace, monospace" }}>{row.sortOrder}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        style={btn}
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || reorderMutation.isPending}
                        aria-label={t("AdminOffers.moveUp")}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        style={btn}
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1 || reorderMutation.isPending}
                        aria-label={t("AdminOffers.moveDown")}
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
  );
}
