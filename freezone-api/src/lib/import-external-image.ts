import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getBestImageUrlCandidates } from "./image-url-candidates";
import { assertSafeExternalUrl } from "./ssrf-url";
import { detectImageExt, mimeFromImageExt, readImageDimensions } from "./image-magic";

const MAX_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 25_000;

export type ImportedImageResult = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalSourceUrl: string;
};

function uploadsProductsDir(): string {
  const now = new Date();
  const y = String(now.getUTCFullYear());
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return path.join(process.cwd(), "public", "uploads", "products", y, m);
}

function publicUrlForFile(relFromUploads: string): string {
  return `/uploads/${relFromUploads.replace(/\\/g, "/")}`;
}

function contentTypeAllowed(contentType: string, ext: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes("text/html") || ct.includes("application/json") || ct.includes("svg")) return false;
  if (ct.startsWith("image/")) return true;
  return [".png", ".jpg", ".webp", ".gif"].includes(ext);
}

async function fetchImageBuffer(startUrl: string): Promise<{ buf: Buffer; contentType: string }> {
  let current = startUrl;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    for (let hop = 0; hop < 6; hop++) {
      await assertSafeExternalUrl(current);
      const res = await fetch(current, {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "FreeZone-Admin-ImageImport/1.0",
        },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) throw new Error("REDIRECT_NO_LOCATION");
        current = new URL(loc, current).href;
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }
      const lenHeader = res.headers.get("content-length");
      if (lenHeader) {
        const len = parseInt(lenHeader, 10);
        if (Number.isFinite(len) && len > MAX_BYTES) {
          throw new Error("TOO_LARGE");
        }
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength > MAX_BYTES) throw new Error("TOO_LARGE");
      if (ab.byteLength < 12) throw new Error("TOO_SMALL");
      const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
      return { buf: Buffer.from(ab), contentType };
    }
    throw new Error("TOO_MANY_REDIRECTS");
  } finally {
    clearTimeout(timer);
  }
}

export async function importExternalImage(
  sourceUrl: string,
  opts?: { productId?: number },
): Promise<ImportedImageResult> {
  await assertSafeExternalUrl(sourceUrl);
  const candidates = getBestImageUrlCandidates(sourceUrl);
  let lastErr: Error | null = null;
  let buf: Buffer | null = null;
  let contentType = "";
  let usedUrl = sourceUrl;

  for (const candidate of candidates) {
    try {
      await assertSafeExternalUrl(candidate);
      const fetched = await fetchImageBuffer(candidate);
      const ext = detectImageExt(fetched.buf);
      if (!ext) {
        lastErr = new Error("NOT_IMAGE");
        continue;
      }
      if (!contentTypeAllowed(fetched.contentType, ext)) {
        lastErr = new Error("NOT_IMAGE");
        continue;
      }
      buf = fetched.buf;
      contentType = fetched.contentType || mimeFromImageExt(ext);
      usedUrl = candidate;
      break;
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error("FETCH_FAILED");
    }
  }

  if (!buf) {
    const code = lastErr?.message ?? "FETCH_FAILED";
    if (code === "TOO_LARGE") throw new Error("TOO_LARGE");
    if (code === "NOT_IMAGE") throw new Error("NOT_IMAGE");
    throw new Error("FETCH_FAILED");
  }

  const ext = detectImageExt(buf)!;
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 12);
  const ts = Date.now();
  const pid = opts?.productId != null && Number.isFinite(opts.productId) ? `product-${opts.productId}` : "import";
  const filename = `${pid}-${ts}-${hash}${ext}`;

  const dir = uploadsProductsDir();
  await mkdir(dir, { recursive: true });
  const fsPath = path.join(dir, filename);
  await writeFile(fsPath, buf);

  const rel = path.relative(path.join(process.cwd(), "public", "uploads"), fsPath);
  const url = publicUrlForFile(rel);
  const dims = readImageDimensions(buf, ext);

  return {
    url,
    filename,
    mimeType: mimeFromImageExt(ext),
    size: buf.length,
    width: dims?.width ?? null,
    height: dims?.height ?? null,
    originalSourceUrl: sourceUrl,
  };
}
