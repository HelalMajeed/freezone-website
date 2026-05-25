"use client";

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { freezoneApiUrl } from "@/lib/api-internal";
import { AdminPageHeader } from "@/components/admin/ui/AdminPageHeader";
import { ACHIEVEMENTS } from "@/data/achievements";
import { useDashboardAuth } from "@/lib/dashboard/auth-store";
import { getDailyGoal } from "@/lib/admin/admin-user-prefs";

async function fetchMyStats(userId: number) {
  const res = await fetch(freezoneApiUrl("/api/admin/operator-stats"), { credentials: "include" });
  if (!res.ok) throw new Error("stats");
  const j = (await res.json()) as { data?: { myDrafts: number; productsCreatedToday: number } };
  return j.data;
}

export default function AdminMePage() {
  const user = useDashboardAuth((s) => s.user);
  const q = useQuery({
    queryKey: ["admin-me", user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => fetchMyStats(user!.id),
  });
  const publishedEstimate = (q.data?.myDrafts ?? 0) + (q.data?.productsCreatedToday ?? 0) * 10;
  const earned = ACHIEVEMENTS.filter((a) => publishedEstimate >= a.minProducts);

  return (
    <div dir="rtl">
      <AdminPageHeader title="صفحتي" description={user?.name ?? ""} />
      <p>هدف اليوم: {getDailyGoal(user?.id ?? null)} منتج</p>
      <p>منشور تقريبي (تقدير): {publishedEstimate}</p>
      <h3>إنجازات</h3>
      <ul>
        {earned.map((a) => (
          <li key={a.id}>
            {a.icon} {a.titleAr} — {a.descAr}
          </li>
        ))}
        {earned.length === 0 ? <li>استمر — أول إنجاز عند 10 منتجات</li> : null}
      </ul>
      <Link to="/admin/inbox">صندوق الوارد</Link>
    </div>
  );
}
