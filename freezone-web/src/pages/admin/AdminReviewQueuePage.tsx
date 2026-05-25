"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

type QueueItem = {
  id: number;
  nameAr: string;
  nameEn: string;
  sku: string;
  price: number;
  quantity: number;
  catalogStatus: string;
  submittedAt: string | null;
  updatedAt: string;
  category: { nameAr: string; nameEn: string };
  brandRef: { nameAr: string; nameEn: string } | null;
  images: { url: string }[];
};

export default function AdminReviewQueuePage() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        freezoneApiUrl(`/api/admin/review-queue?page=${page}&pageSize=25`),
        { credentials: "include" },
      );
      if (!res.ok) throw new Error("load");
      const j = (await res.json()) as {
        data?: { items: QueueItem[]; total: number; totalPages: number };
      };
      setItems(j.data?.items ?? []);
      setTotal(j.data?.total ?? 0);
      setTotalPages(j.data?.totalPages ?? 1);
    } catch {
      toast.error("تعذّر تحميل قائمة المراجعة");
      setItems([]);
    }
    setLoading(false);
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function reviewAction(productId: number, action: "publish" | "changes_requested") {
    setActingId(productId);
    try {
      const res = await fetch(freezoneApiUrl("/api/admin/review-queue"), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          action,
          reviewNotes: notes[productId]?.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("patch");
      toast.success(action === "publish" ? "تم النشر" : "طُلبت تعديلات");
      await load();
    } catch {
      toast.error("تعذّر تنفيذ الإجراء");
    }
    setActingId(null);
  }

  return (
    <div dir="rtl">
      <AdminPageHeader
        title="قائمة المراجعة"
        description={`${total} منتج بانتظار المراجعة`}
      />
      {loading ? <p>جاري التحميل…</p> : null}
      {!loading && items.length === 0 ? <p>لا منتجات بانتظار المراجعة.</p> : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {items.map((p) => {
          const thumb = p.images[0]?.url;
          const busy = actingId === p.id;
          const label = p.nameAr || p.nameEn;
          return (
            <article
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "80px 1fr auto",
                gap: 16,
                padding: 16,
                border: "1px solid #334155",
                borderRadius: 12,
                alignItems: "start",
              }}
            >
              {thumb ? (
                <img src={thumb} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }} />
              ) : (
                <div style={{ width: 72, height: 72, background: "#1e293b", borderRadius: 8 }} />
              )}
              <div>
                <strong>{label}</strong>
                <div style={{ fontSize: 12, color: "#94a3b8" }}>
                  #{p.id} · {p.category.nameAr || p.category.nameEn} · {p.price.toLocaleString("ar-IQ")} د.ع ·
                  مخزون {p.quantity}
                </div>
                <textarea
                  placeholder="ملاحظات المراجعة (اختياري)"
                  value={notes[p.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [p.id]: e.target.value }))}
                  rows={2}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    borderRadius: 8,
                    border: "1px solid #334155",
                    padding: 8,
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 140 }}>
                <Link to={`/admin/products/edit/${p.id}?review=1`}>فتح للمراجعة</Link>
                <button type="button" disabled={busy} onClick={() => void reviewAction(p.id, "publish")}>
                  نشر
                </button>
                <button type="button" disabled={busy} onClick={() => void reviewAction(p.id, "changes_requested")}>
                  طلب تعديلات
                </button>
              </div>
            </article>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 16 }}>
        <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          السابق
        </button>
        <span>
          صفحة {page} / {totalPages}
        </span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          التالي
        </button>
      </div>
    </div>
  );
}
