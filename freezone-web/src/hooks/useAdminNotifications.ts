import { useEffect, useState } from "react";
import { fetchAdminNotifications, type AdminNotifications } from "@/lib/admin/admin-notifications";

const POLL_MS = 30_000;

export function useAdminNotifications(enabled = true): AdminNotifications {
  const [data, setData] = useState<AdminNotifications>({
    pendingReview: 0,
    newComments: 0,
    categoriesNoAttrs: 0,
    role: "CATALOG_EDITOR",
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const load = async () => {
      try {
        const n = await fetchAdminNotifications();
        if (!cancelled) setData(n);
      } catch {
        /* keep last */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [enabled]);

  return data;
}
