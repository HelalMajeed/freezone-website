import { useRef, useState } from "react";
import {
  DashboardApiError,
  uploadDashboardFile,
} from "@/lib/dashboard/api";
import { freezoneApiUrl } from "@/lib/api-internal";
import { Button } from "@/components/dashboard/ui";

type Lang = "ar" | "en";

function resolveImage(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return freezoneApiUrl(url);
}

/**
 * Edits an ordered list of product image URLs.
 * The parent owns the list (controlled component); this UI uploads to
 * `/api/admin/upload`, then surfaces the returned `/uploads/...` URL.
 */
export function ProductImagesEditor({
  value,
  onChange,
  lang,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  lang: Lang;
  disabled?: boolean;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const accepted: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          setError(lang === "ar" ? "صور فقط." : "Images only.");
          continue;
        }
        if (file.size > 8 * 1024 * 1024) {
          setError(lang === "ar" ? "كل صورة ≤ ٨ ميغابايت." : "Each image must be ≤ 8 MB.");
          continue;
        }
        const { url } = await uploadDashboardFile(file, {
          register: true,
          title: "Product image",
        });
        accepted.push(url);
      }
      if (accepted.length > 0) onChange([...value, ...accepted]);
    } catch (e) {
      setError(e instanceof DashboardApiError ? e.code : "UPLOAD_FAILED");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i: number) => {
    const next = value.filter((_, idx) => idx !== i);
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 13, color: "var(--fz-text-soft)" }}>
          {value.length > 0
            ? lang === "ar"
              ? `${value.length} صورة. أول صورة هي الغلاف.`
              : `${value.length} image${value.length === 1 ? "" : "s"}. The first one is the cover.`
            : lang === "ar"
              ? "لا توجد صور بعد."
              : "No images yet."}
        </span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={() => fileRef.current?.click()}
          loading={uploading}
          disabled={disabled}
          type="button"
        >
          + {lang === "ar" ? "رفع صور" : "Upload images"}
        </Button>
      </div>

      {error && (
        <div
          style={{
            background: "var(--fz-danger-bg)",
            color: "var(--fz-danger)",
            padding: "8px 12px",
            borderRadius: "var(--fz-radius)",
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {value.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
          }}
        >
          {value.map((url, i) => (
            <div
              key={`${url}-${i}`}
              style={{
                border: "1px solid var(--fz-border, #e5e7eb)",
                borderRadius: 10,
                overflow: "hidden",
                background: "var(--fz-bg-soft, #f8fafc)",
                position: "relative",
              }}
            >
              <div
                style={{
                  aspectRatio: "1 / 1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#fff",
                }}
              >
                <img
                  src={resolveImage(url)}
                  alt={`#${i + 1}`}
                  style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  padding: 6,
                  borderTop: "1px solid var(--fz-border, #e5e7eb)",
                  fontSize: 12,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ color: "var(--fz-text-muted)" }}>
                  {i === 0 ? (lang === "ar" ? "غلاف" : "Cover") : `#${i + 1}`}
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={disabled || i === 0}
                    onClick={() => move(i, -1)}
                    title={lang === "ar" ? "للأعلى" : "Up"}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={disabled || i === value.length - 1}
                    onClick={() => move(i, 1)}
                    title={lang === "ar" ? "للأسفل" : "Down"}
                  >
                    ↓
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    disabled={disabled}
                    onClick={() => remove(i)}
                    title={lang === "ar" ? "حذف" : "Remove"}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
