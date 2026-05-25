"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import {
  loadInboxReadIds,
  markAllInboxRead,
  markInboxRead,
} from "@/lib/admin/admin-user-prefs";

type InboxItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
  unread: boolean;
};

export default function AdminInboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch(freezoneApiUrl("/api/admin/inbox"), { credentials: "include" });
    if (res.ok) {
      const j = (await res.json()) as { data?: { items: InboxItem[] } };
      const read = loadInboxReadIds();
      setItems(
        (j.data?.items ?? []).map((it) => ({
          ...it,
          unread: !read.has(it.id),
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const shown = filter === "unread" ? items.filter((i) => i.unread) : items;

  return (
    <div dir="rtl">
      <AdminPageHeader
        title="صندوق الوارد"
        description="تعليقات المراجعة، طلبات التعديل، ومهام النشر"
        actions={
          <button
            type="button"
            onClick={() => {
              markAllInboxRead(items.map((i) => i.id));
              void load();
            }}
          >
            تعليم الكل كمقروء
          </button>
        }
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setFilter("all")} disabled={filter === "all"}>
          الكل
        </button>
        <button type="button" onClick={() => setFilter("unread")} disabled={filter === "unread"}>
          غير مقروء
        </button>
      </div>
      {loading ? <p>جاري التحميل…</p> : null}
      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
        {shown.map((it) => (
          <li
            key={it.id}
            style={{
              padding: 14,
              borderRadius: 10,
              border: "1px solid var(--fz-border)",
              background: it.unread ? "rgba(59,130,246,0.08)" : "transparent",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <strong>{it.title}</strong>
              <span style={{ fontSize: 11, color: "var(--fz-text-muted)" }}>{it.type}</span>
            </div>
            <p style={{ margin: "6px 0", fontSize: 14 }}>{it.body}</p>
            <div style={{ display: "flex", gap: 12, fontSize: 13 }}>
              <Link
                to={it.href}
                onClick={() => {
                  markInboxRead(it.id);
                }}
              >
                فتح
              </Link>
              <button type="button" onClick={() => { markInboxRead(it.id); void load(); }}>
                مقروء
              </button>
            </div>
          </li>
        ))}
      </ul>
      {!loading && shown.length === 0 ? <p>لا رسائل.</p> : null}
    </div>
  );
}
