/** Client-side uploads to `/api/admin/upload` (admin session required). */

const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const SITE_LOGO_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "application/pdf"]);
const MODEL_TYPES = new Set([
  "model/gltf-binary",
  "model/gltf+json",
  "model/gltf",
  "application/octet-stream",
]);

export function assertAllowedImageFile(file: File): void {
  const extOk = /\.(png|jpe?g|webp)$/i.test(file.name);
  const typeOk = !file.type || IMAGE_TYPES.has(file.type);
  if (!extOk && !typeOk) {
    throw new Error("يُسمح بصور PNG أو JPEG أو WebP فقط.");
  }
  if (file.type && !IMAGE_TYPES.has(file.type) && !extOk) {
    throw new Error("نوع الملف غير مدعوم — استخدم PNG أو JPEG أو WebP.");
  }
}

export function assertAllowedModel3dFile(file: File): void {
  const extOk = /\.(glb|gltf)$/i.test(file.name);
  const typeOk = !file.type || MODEL_TYPES.has(file.type);
  if (!extOk && !typeOk) {
    throw new Error("يُسمح بنماذج GLB أو GLTF فقط.");
  }
  if (file.type && !MODEL_TYPES.has(file.type) && !extOk) {
    throw new Error("نوع الملف غير مدعوم للنموذج — استخدم .glb أو .gltf");
  }
}

async function postUpload(file: File): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("filename", file.name);
  const res = await fetch("/api/admin/upload", { method: "POST", credentials: "include", body: fd });
  const j = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok) {
    throw new Error(j.error || "فشل الرفع.");
  }
  if (!j.url) {
    throw new Error("استجابة غير صالحة من الخادم.");
  }
  return j.url;
}

export function assertAllowedSiteLogoFile(file: File): void {
  const extOk = /\.(png|jpe?g|pdf)$/i.test(file.name);
  const typeOk = !file.type || SITE_LOGO_TYPES.has(file.type);
  if (!extOk && !typeOk) {
    throw new Error("يُسمح بملفات PNG أو JPEG أو PDF للشعار.");
  }
  if (file.type && !SITE_LOGO_TYPES.has(file.type) && !extOk) {
    throw new Error("نوع الملف غير مدعوم — استخدم PNG أو JPEG أو PDF.");
  }
}

export async function uploadAdminImage(file: File): Promise<string> {
  assertAllowedImageFile(file);
  return postUpload(file);
}

/** Store logo / admin identity — allows PDF (vector) in addition to PNG/JPEG. */
export async function uploadAdminSiteLogo(file: File): Promise<string> {
  assertAllowedSiteLogoFile(file);
  return postUpload(file);
}

export async function uploadAdminModel3d(file: File): Promise<string> {
  assertAllowedModel3dFile(file);
  return postUpload(file);
}
