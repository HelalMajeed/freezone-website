"use client";

import { useState } from "react";
import { AdminProductFormSection } from "@/components/admin/products/AdminProductFormSection";
import { uploadProductImageFile, type LoadedProduct } from "@/lib/admin/product-editor-api";
import { freezoneApiUrl } from "@/lib/api-internal";
import { confirmDialog } from "@/lib/confirm";

export function ImagesSection({
  productId,
  images,
  onImagesChange,
}: {
  productId: number;
  images: LoadedProduct["images"];
  onImagesChange: (next: LoadedProduct["images"]) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    if (images.length + files.length > 10) {
      window.alert("الحد الأقصى 10 صور");
      return;
    }
    setBusy(true);
    try {
      const uploaded: LoadedProduct["images"] = [];
      for (const file of Array.from(files)) {
        const u = await uploadProductImageFile(file);
        uploaded.push({
          id: 0,
          url: u.url,
          urlW200: u.urlW200,
          urlW400: u.urlW400,
          urlW800: u.urlW800,
          sortOrder: images.length + uploaded.length,
          isCover: images.length === 0 && uploaded.length === 0,
        });
      }
      const merged = [...images, ...uploaded];
      const res = await fetch(freezoneApiUrl(`/api/admin/products/${productId}/images`), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: merged.map((img) => ({ url: img.url, originalSourceUrl: null })),
        }),
      });
      if (!res.ok) throw new Error("تعذّر ربط الصور بالمنتج");
      const reload = await fetch(freezoneApiUrl(`/api/admin/products/${productId}`), { credentials: "include" });
      const row = (await reload.json()) as { images?: LoadedProduct["images"] };
      onImagesChange(row.images ?? merged);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "فشل الرفع");
    } finally {
      setBusy(false);
    }
  }

  async function removeImage(img: LoadedProduct["images"][0]) {
    if (img.id) {
      const ok = await confirmDialog({
        title: "حذف الصورة",
        message: "هل أنت متأكد من حذف هذه الصورة؟",
        confirmLabel: "حذف",
      });
      if (!ok) return;
      await fetch(freezoneApiUrl(`/api/admin/product-images/${img.id}`), {
        method: "DELETE",
        credentials: "include",
      });
    }
    onImagesChange(images.filter((x) => x !== img));
  }

  return (
    <AdminProductFormSection title="الصور" subtitle="حتى 10 صور، 800×800 كحد أدنى، 5MB كحد أقصى">
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={busy}
        onChange={(e) => void onFiles(e.target.files)}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))", gap: 12 }}>
        {images.map((img) => (
          <div key={img.id || img.url} style={{ border: "1px solid #334155", borderRadius: 8, padding: 8 }}>
            <img src={img.urlW400 ?? img.url} alt="" style={{ width: "100%", borderRadius: 4 }} />
            <button type="button" onClick={() => void removeImage(img)} style={{ marginTop: 6, width: "100%" }}>
              حذف
            </button>
          </div>
        ))}
      </div>
    </AdminProductFormSection>
  );
}
