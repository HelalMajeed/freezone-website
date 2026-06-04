import {
  CATEGORY_PROMO_IMAGE_HEIGHT,
  CATEGORY_PROMO_IMAGE_WIDTH,
} from "@/lib/category-promo-image-spec";

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذّر قراءة الصورة"));
    };
    img.src = url;
  });
}

/** Cover-crop to exact 1200×800 for promo mega cards. */
export async function resizeCategoryPromoImageFile(file: File): Promise<File> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  canvas.width = CATEGORY_PROMO_IMAGE_WIDTH;
  canvas.height = CATEGORY_PROMO_IMAGE_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("تعذّر معالجة الصورة");

  const scale = Math.max(
    CATEGORY_PROMO_IMAGE_WIDTH / img.naturalWidth,
    CATEGORY_PROMO_IMAGE_HEIGHT / img.naturalHeight,
  );
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  const x = (CATEGORY_PROMO_IMAGE_WIDTH - w) / 2;
  const y = (CATEGORY_PROMO_IMAGE_HEIGHT - h) / 2;
  ctx.drawImage(img, x, y, w, h);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("فشل ضغط الصورة"))),
      "image/jpeg",
      0.88,
    );
  });

  const base = file.name.replace(/\.[^.]+$/, "") || "category";
  return new File([blob], `${base}-1200x800.jpg`, { type: "image/jpeg" });
}
