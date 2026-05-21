import { freezoneApiUrl } from "./api-internal";

export type ImportedImagePayload = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalSourceUrl: string;
  productImageId?: number | null;
};

export async function importAdminImageFromUrl(
  sourceUrl: string,
  opts?: { productId?: number; alt?: string },
): Promise<ImportedImagePayload> {
  const res = await fetch(freezoneApiUrl("/api/admin/media/import-image"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: sourceUrl.trim(),
      productId: opts?.productId,
      alt: opts?.alt,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    image?: ImportedImagePayload;
  };
  if (!res.ok || !j.ok || !j.image?.url) {
    throw new Error(j.error || "تعذّر تنزيل الصورة. تأكد أن الرابط مباشر لصورة.");
  }
  return j.image;
}
