import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { auditContext, guardAdminMutate } from "@/lib/admin-route-guard";
import { prisma, isDatabaseConfigured } from "@/lib/prisma";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { logAdminAction } from "@/lib/admin-audit";

function extFromImageMagic(buf: Buffer): ".png" | ".jpg" | null {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return ".png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return ".jpg";
  }
  return null;
}

/** RIFF container, "WEBP" at offset 8 */
function extFromWebpMagic(buf: Buffer): ".webp" | null {
  if (buf.length < 12) return null;
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return ".webp";
  }
  return null;
}

/** glTF binary: magic 0x46546C67 ("glTF") at byte 0 per Khronos GLB header */
function extFromGlbMagic(buf: Buffer): ".glb" | null {
  if (buf.length < 12) return null;
  if (buf.readUInt32LE(0) === 0x46546c67) return ".glb";
  return null;
}

/** JSON glTF 2.0 — must parse and contain top-level asset */
function extFromGltfJson(buf: Buffer): ".gltf" | null {
  const raw = buf.toString("utf8", 0, Math.min(buf.length, 2_000_000)).trimStart();
  if (!raw.startsWith("{")) return null;
  try {
    const j = JSON.parse(raw) as { asset?: unknown };
    if (j && typeof j === "object" && j.asset != null) return ".gltf";
  } catch {
    return null;
  }
  return null;
}

/** PDF files start with %PDF */
function extFromPdfMagic(buf: Buffer): ".pdf" | null {
  if (buf.length < 5) return null;
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return ".pdf";
  return null;
}

function detectExt(buf: Buffer): string | null {
  const img = extFromImageMagic(buf);
  if (img) return img;
  const webp = extFromWebpMagic(buf);
  if (webp) return webp;
  const pdf = extFromPdfMagic(buf);
  if (pdf) return pdf;
  const glb = extFromGlbMagic(buf);
  if (glb) return glb;
  const gltf = extFromGltfJson(buf);
  if (gltf) return gltf;
  return null;
}

export async function POST(req: Request) {
  const g = await guardAdminMutate(req);
  if (!g.ok) return g.response;
  const audit = auditContext(g.actor, req);
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof Blob)) {
    return Response.json({ error: "Missing file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length < 12) {
    return Response.json({ error: "File too small" }, { status: 400 });
  }
  const ext = detectExt(buf);
  if (!ext) {
    return Response.json(
      { error: "Allowed: PNG, JPEG, WebP, PDF, GLB, or GLTF JSON (invalid file content)." },
      { status: 400 },
    );
  }
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, name);
  await writeFile(fsPath, buf);
  const url = `/uploads/${name}`;

  const register = form.get("registerLibrary") === "true";
  if (register && isDatabaseConfigured()) {
    try {
      const title = String(form.get("title") ?? "");
      const altAr = String(form.get("altAr") ?? "");
      const altEn = String(form.get("altEn") ?? "");
      const kind = ext === ".glb" || ext === ".gltf" ? "model3d" : "image";
      await prisma.mediaAsset.create({
        data: {
          url,
          mimeType: file.type || "",
          kind,
          title,
          altAr,
          altEn,
          fileSize: buf.length,
        },
      });
      revalidateStorefrontData();
    } catch (e) {
      console.error("[upload] media registry:", e);
    }
  }

  await logAdminAction("upload.file", "Upload", {
    payload: { url, registerLibrary: register },
    ...audit,
  });
  return Response.json({ url });
}
