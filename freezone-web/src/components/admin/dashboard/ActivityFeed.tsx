"use client";

import { useQuery } from "@tanstack/react-query";
import { freezoneApiUrl } from "@/lib/api-internal";

type FeedItem = {
  id: number;
  action: string;
  entity: string;
  entityId: string | null;
  userEmail: string | null;
  createdAt: string;
  summary: string;
};

async function fetchFeed(): Promise<FeedItem[]> {
  const res = await fetch(freezoneApiUrl("/api/admin/activity-feed?limit=20"), { credentials: "include" });
  if (!res.ok) return [];
  const j = (await res.json()) as { data?: { items: FeedItem[] } };
  return j.data?.items ?? [];
}

export function ActivityFeed() {
  const q = useQuery({
    queryKey: ["admin-activity-feed"],
    queryFn: fetchFeed,
    refetchInterval: 30_000,
  });

  return (
    <section dir="rtl">
      <h3 style={{ margin: "0 0 10px" }}>نشاط الفريق (مباشر)</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 320, overflow: "auto" }}>
        {(q.data ?? []).map((item) => (
          <li
            key={item.id}
            style={{
              padding: "8px 0",
              borderBottom: "1px solid var(--fz-border)",
              fontSize: 13,
            }}
          >
            <div>{item.summary}</div>
            <div style={{ color: "var(--fz-text-muted)", fontSize: 11 }}>
              {item.userEmail ?? "—"} · {new Date(item.createdAt).toLocaleString("ar-IQ")}
            </div>
          </li>
        ))}
        {!q.data?.length && !q.isLoading ? <li style={{ color: "var(--fz-text-muted)" }}>لا نشاط بعد.</li> : null}
      </ul>
    </section>
  );
}
