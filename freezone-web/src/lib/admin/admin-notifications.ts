import { freezoneApiUrl } from "@/lib/api-internal";

export type AdminNotifications = {
  pendingReview: number;
  newComments: number;
  categoriesNoAttrs: number;
  role: string;
};

export async function fetchAdminNotifications(): Promise<AdminNotifications> {
  const res = await fetch(freezoneApiUrl("/api/admin/notifications"), {
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`notifications ${res.status}`);
  const j = (await res.json()) as { data?: AdminNotifications };
  return (
    j.data ?? {
      pendingReview: 0,
      newComments: 0,
      categoriesNoAttrs: 0,
      role: "CATALOG_EDITOR",
    }
  );
}
