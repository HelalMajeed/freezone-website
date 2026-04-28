"use client";

import { useCallback, useEffect, useState } from "react";

export type MediaRow = {
  id: number;
  url: string;
  kind: string;
  title: string;
  altAr: string;
  altEn: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  multi?: boolean;
  onSelect: (rows: MediaRow[]) => void;
};

export function MediaPickerModal({ open, onClose, multi = false, onSelect }: Props) {
  const [list, setList] = useState<MediaRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/media?q=${encodeURIComponent(q)}`, {
      credentials: "include",
    });
    if (res.ok) setList(await res.json());
  }, [q]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  if (!open) return null;

  function toggle(id: number) {
    setSelected((prev) => {
      const next = new Set(multi ? prev : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmPick() {
    const rows = list.filter((m) => selected.has(m.id));
    if (rows.length) onSelect(rows);
    onClose();
    setSelected(new Set());
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.65)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      role="dialog"
      aria-modal
    >
      <div
        style={{
          background: "var(--admin-surface-muted)",
          border: "1px solid #334155",
          borderRadius: 12,
          maxWidth: 900,
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: 14, borderBottom: "1px solid #334155", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <strong style={{ flex: 1 }}>اختر من المكتبة {multi ? "(متعدد)" : ""}</strong>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="بحث…"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #334155", background: "var(--admin-surface)", color: "#fff" }}
          />
          <button type="button" className="btn" style={{ padding: "8px 12px" }} onClick={() => load()}>
            بحث
          </button>
          <button type="button" onClick={onClose} style={{ padding: "8px 12px", background: "transparent", border: "1px solid #475569", color: "var(--admin-text)", borderRadius: 6 }}>
            إغلاق
          </button>
        </div>
        <div style={{ padding: 12, overflow: "auto", flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 }}>
          {list.map((m) => {
            const on = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                style={{
                  border: on ? "2px solid #dc2626" : "1px solid #334155",
                  borderRadius: 8,
                  padding: 6,
                  background: "var(--admin-surface)",
                  cursor: "pointer",
                  textAlign: "right",
                }}
              >
                {m.kind === "image" ? (
                  <img src={m.url} alt="" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 4 }} />
                ) : (
                  <div style={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11 }}>
                    {m.kind}
                  </div>
                )}
                <div style={{ fontSize: 10, color: "var(--admin-muted)", marginTop: 4 }}>{m.title || m.url}</div>
              </button>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: "1px solid #334155", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={confirmPick} style={{ padding: "10px 18px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700 }}>
            إدراج المحدد
          </button>
        </div>
      </div>
    </div>
  );
}
