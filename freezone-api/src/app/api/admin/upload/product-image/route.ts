import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { logAdminAction } from "@/lib/admin-audit";
import { processProductImageUpload } from "@/lib/product-image-process";

const ERROR_AR: Record<string, string> = {
  IMAGE_TOO_LARGE: "حجم الصورة أكبر من 5 ميجابايت",
  IMAGE_TOO_SMALL: "أبعاد الصورة يجب أن تكون 800×800 بكسل على الأقل",
};

export async function POST(req: Request): Promise<Response> {
  const mutateGuard = await guardAdminMutate(req);
  if (!mutateGuard.ok) return mutateGuard.response;
  const audit = auditContext(mutateGuard.actor, req);

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json(
      { ok: false, error: "الملف مفقود", code: "MISSING_FILE" },
      { status: 400 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const processed = await processProductImageUpload(buf);
    await logAdminAction("upload.productImage", "Upload", {
      payload: { width: processed.width, height: processed.height },
      ...audit,
    });
    return Response.json({ ok: true, data: processed });
  } catch (e) {
    const code = e instanceof Error ? e.message : "UPLOAD_FAILED";
    const message = ERROR_AR[code] ?? "تعذّر معالجة الصورة";
    return Response.json({ ok: false, error: message, code }, { status: 400 });
  }
}
