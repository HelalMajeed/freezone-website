import { STOREFRONT_DATA_TAG } from "./storefront-cache-tag";

/** يُبلّغ Next.js بإبطال كاش الواجهة بعد تعديلات الإدارة */
export function revalidateStorefrontData(): void {
  const origin = process.env.NEXT_INTERNAL_ORIGIN?.replace(/\/$/, "") || "http://127.0.0.1:3000";
  const secret = process.env.REVALIDATE_SECRET || "";
  void fetch(`${origin}/api/internal/revalidate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tag: STOREFRONT_DATA_TAG, secret }),
  }).catch(() => {});
}
