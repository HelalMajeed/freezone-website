"use client";

import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";

export default function AdminCategoryStatsPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ["category-stats", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(freezoneApiUrl(`/api/admin/categories/${id}/stats`), {
        credentials: "include",
      });
      if (!res.ok) throw new Error("stats");
      const j = (await res.json()) as { data: Record<string, unknown> };
      return j.data;
    },
  });

  const d = q.data as {
    category?: { nameAr: string; nameEn: string };
    counts?: { active: number; draft: number; archived: number; total: number };
    avgPrice?: number;
    attributeCount?: number;
    timeline?: Array<{ month: string; count: number }>;
  } | undefined;

  return (
    <div dir="rtl">
      <AdminPageHeader
        title={`تحليلات القسم: ${d?.category?.nameAr ?? id}`}
        description={d?.category?.nameEn}
        actions={<Link to={`/admin/categories/${id}`}>← القسم</Link>}
      />
      {q.isLoading ? <p>جاري التحميل…</p> : null}
      {d?.counts ? (
        <ul>
          <li>نشط (منشور): {d.counts.active}</li>
          <li>مسودة: {d.counts.draft}</li>
          <li>مؤرشف: {d.counts.archived}</li>
          <li>متوسط السعر: {d.avgPrice?.toLocaleString("ar-IQ")} د.ع</li>
          <li>عدد السمات: {d.attributeCount}</li>
        </ul>
      ) : null}
      {d?.timeline?.length ? (
        <section>
          <h3>إضافات المنتجات (شهرياً)</h3>
          <ul>
            {d.timeline.map((t) => (
              <li key={t.month}>
                {t.month}: {t.count}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
