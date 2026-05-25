"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { freezoneApiUrl } from "@/lib/api-internal";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";

type CommentRow = {
  id: number;
  text: string;
  createdAt: string;
  user: { id: number; name: string; email: string; role: string };
};

export function ProductCommentsSection({
  productId,
  readOnly,
}: {
  productId: number;
  readOnly?: boolean;
}) {
  const user = useDashboardAuth((s) => s.user);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/comments`), {
      credentials: "include",
    });
    if (!res.ok) return;
    const j = (await res.json()) as { data?: { comments?: CommentRow[] } };
    setComments(j.data?.comments ?? []);
  }, [productId]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  async function submit() {
    const t = text.trim();
    if (!t) return;
    const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/comments`), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: t }),
    });
    if (!res.ok) {
      toast.error("تعذّر إرسال التعليق");
      return;
    }
    setText("");
    toast.success("تم إرسال التعليق");
    await load();
  }

  return (
    <aside
      style={{
        position: "fixed",
        left: 16,
        top: 120,
        width: 280,
        maxHeight: "calc(100vh - 140px)",
        overflow: "auto",
        background: "#0f172a",
        border: "1px solid #334155",
        borderRadius: 12,
        padding: 12,
        zIndex: 20,
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>تعليقات المراجعة</h3>
      {loading ? <p style={{ fontSize: 12, color: "#94a3b8" }}>جاري التحميل…</p> : null}
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {comments.map((c) => (
          <li
            key={c.id}
            style={{
              fontSize: 12,
              padding: 8,
              borderRadius: 8,
              background: c.user.id === user?.id ? "#1e3a5f" : "#1e293b",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4 }}>
              {c.user.name || c.user.email}{" "}
              <span style={{ color: "#64748b", fontWeight: 400 }}>{c.user.role}</span>
            </div>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{c.text}</p>
            <time style={{ fontSize: 10, color: "#64748b" }}>
              {new Date(c.createdAt).toLocaleString("ar-IQ")}
            </time>
          </li>
        ))}
        {!loading && comments.length === 0 ? (
          <li style={{ fontSize: 12, color: "#94a3b8" }}>لا تعليقات بعد.</li>
        ) : null}
      </ul>
      {!readOnly ? (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder="ملاحظة للمراجع أو المشغّل…"
            style={{
              width: "100%",
              borderRadius: 8,
              border: "1px solid #334155",
              background: "#020617",
              color: "#f1f5f9",
              padding: 8,
              fontFamily: "inherit",
              fontSize: 12,
            }}
          />
          <button type="button" style={{ marginTop: 8, width: "100%" }} onClick={() => void submit()}>
            إضافة تعليق
          </button>
        </>
      ) : null}
    </aside>
  );
}
