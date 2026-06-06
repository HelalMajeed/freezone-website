// In-process orchestrator for the Global Iraq importer.
//
// Wires together: sitemap walk → handle dedupe → Shopify scrape → FreeZone
// payload mapping → smart category match → CategoryAttribute backfill →
// product create (loop-back call into the admin route, so spec validation +
// EAV persistence + audit log all happen) → image mirroring → variant upsert.
//
// Sprint 1 replaced Sprint 0's direct-Prisma Product write with a call into
// the admin POST route, after first ensuring the target category's
// CategoryAttribute schema covers every key we want to persist (so the
// validator never rejects an import). See `ensureCategoryAttributes`.

import { prisma } from "@/lib/prisma";
import { importExternalImage } from "@/lib/import-external-image";
import { revalidateStorefrontData } from "@/lib/revalidate-storefront";
import { internalActorHeaders } from "@/lib/internal-actor";
import * as adminProductsRoute from "@/app/api/admin/products/route";
import { fetchProductUrls, fetchShopifyProduct, handleFromUrl } from "./sitemap";
import {
  shopifyToFreezone,
  type MappedProduct,
  type MappedVariant,
  type ShopifyProduct,
} from "./map-product";
import { resolveCategoryForImport } from "./category-resolve";
import { ensureCategoryAttributes } from "./category-attributes";

const GLOBALIRAQ_BASE = "https://globaliraq.iq";
const GLOBALIRAQ_LOCALE = "ar";
const SOURCE = "globaliraq";

const SITEMAP_CACHE_TTL_MS = 10 * 60 * 1000;
let sitemapCache: { fetchedAt: number; urls: string[] } | null = null;

export interface RunBatchOptions {
  limit: number;
  autoPublish?: boolean;
  /** Free-form identifier so concurrent runners stay distinct in the lock log. */
  owner?: string;
  /** Override for tests. */
  baseUrl?: string;
  /** Stop after this many consecutive failures (default 3). */
  consecutiveFailureLimit?: number;
}

export interface RunBatchResult {
  batchId: string;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  errors: Array<{ handle: string; message: string }>;
}

interface HandleResult {
  handle: string;
  status: "ok" | "failed" | "skipped";
  productId?: number;
  imageCount?: number;
  variantCount?: number;
  error?: string;
  publishStatus?: "published" | "draft";
  /** Spec keys the validator rejected and we stripped to let the product import. */
  droppedSpecKeys?: string[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Hard sanity cap so a typo (`limit=10000`) can never write more than this in one go. */
const MAX_LIMIT_PER_RUN = 100;

/**
 * Run a single batch of the importer. Long-running; the caller (HTTP route)
 * usually invokes this via `setImmediate(...)` and returns the batch id so the
 * client can poll `GET /api/admin/import/globaliraq/batches/:id` for progress.
 */
export async function runImportBatch(opts: RunBatchOptions): Promise<RunBatchResult> {
  const limit = clampLimit(opts.limit);
  const baseUrl = opts.baseUrl ?? GLOBALIRAQ_BASE;
  const failureLimit = opts.consecutiveFailureLimit ?? 3;

  /** Refuse to overlap an in-flight batch. */
  const open = await prisma.importBatch.findFirst({
    where: { source: SOURCE, status: "running" },
  });
  if (open) {
    throw Object.assign(new Error("Another import batch is already running"), {
      code: "BATCH_IN_FLIGHT",
      openBatchId: open.id,
    });
  }

  /** Pull every handle from the sitemap (cached) and subtract anything we already imported. */
  const sitemapUrls = await loadSitemap(baseUrl);
  const knownHandles = new Set(
    (
      await prisma.product.findMany({
        where: { sourceHandle: { not: null } },
        select: { sourceHandle: true },
      })
    ).map((p) => p.sourceHandle as string),
  );
  const pending: Array<{ handle: string; url: string }> = [];
  for (const url of sitemapUrls) {
    const handle = handleFromUrl(url);
    if (!handle) continue;
    if (knownHandles.has(handle)) continue;
    pending.push({ handle, url });
    if (pending.length >= limit) break;
  }

  const batch = await prisma.importBatch.create({
    data: {
      source: SOURCE,
      status: "running",
      total: pending.length,
      lockOwner: opts.owner ?? "run-batch-endpoint",
      notes: `limit=${limit} autoPublish=${opts.autoPublish ? "true" : "false"}`,
    },
  });

  const results: HandleResult[] = [];
  const errors: RunBatchResult["errors"] = [];
  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  let consecutiveFailures = 0;

  try {
    for (const { handle, url } of pending) {
      try {
        const shopify = (await fetchShopifyProduct(url)) as unknown as ShopifyProduct;
        const mapped = shopifyToFreezone(shopify, {
          baseUrl,
          source: SOURCE,
          importBatchId: batch.id,
        });

        /** Second dedupe check inside the loop in case a parallel batch wrote the row. */
        const dupe = await prisma.product.findFirst({
          where: { sourceHandle: handle },
          select: { id: true },
        });
        if (dupe) {
          results.push({ handle, status: "skipped", productId: dupe.id });
          skipped += 1;
          continue;
        }

        /** Sprint 1 path: smart-match the target category from Shopify metadata,
         *  then guarantee every spec key has a CategoryAttribute so the admin
         *  POST validator accepts the payload. */
        const { category, matchedSlug } = await resolveCategoryForImport(mapped.sourceMeta);
        const specKeys = Object.keys(mapped.productPayload.specs ?? {});
        await ensureCategoryAttributes(category.id, specKeys);

        const { id: productId, droppedSpecKeys } = await createProductViaAdminRoute(mapped, category.id, batch.id);
        const { imageCount, localByShopifyUrl } = await mirrorImages(productId, mapped);
        const variantCount = await upsertVariants(productId, mapped.variants, localByShopifyUrl);

        const publishStatus = await maybeAutoPublish(productId, opts.autoPublish === true, {
          mapped,
          imageCount,
          categorySlug: category.slug,
          matchedSlug,
        });

        results.push({
          handle,
          status: "ok",
          productId,
          imageCount,
          variantCount,
          publishStatus,
          ...(droppedSpecKeys.length ? { droppedSpecKeys } : {}),
        });
        succeeded += 1;
        consecutiveFailures = 0;
        /** Gentle pacing so a 50-item batch doesn't trip Global Iraq / Shopify
         *  rate limits on the burst of product + image fetches. */
        await sleep(250);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        results.push({ handle, status: "failed", error: message });
        errors.push({ handle, message });
        failed += 1;
        consecutiveFailures += 1;
        /** Brittle source → bail out so we don't spam the upstream. */
        if (consecutiveFailures >= failureLimit) {
          await prisma.importBatch.update({
            where: { id: batch.id },
            data: {
              status: "halted_consecutive_failures",
              finishedAt: new Date(),
              succeeded,
              failed,
              results: results as unknown as object,
              notes: `${batch.notes ?? ""}\nHalted after ${failureLimit} consecutive failures`.trim(),
            },
          });
          revalidateStorefrontData();
          return { batchId: batch.id, processed: results.length, succeeded, failed, skipped, errors };
        }
      }
    }

    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: failed === 0 ? "completed" : "completed_with_errors",
        finishedAt: new Date(),
        succeeded,
        failed,
        results: results as unknown as object,
        notes: `${batch.notes ?? ""}\nskipped(dedupe)=${skipped}`.trim(),
      },
    });
    revalidateStorefrontData();
    return { batchId: batch.id, processed: results.length, succeeded, failed, skipped, errors };
  } catch (e) {
    await prisma.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        succeeded,
        failed,
        results: results as unknown as object,
        notes: `${batch.notes ?? ""}\nFatal: ${e instanceof Error ? e.message : String(e)}`.trim(),
      },
    });
    throw e;
  }
}

function clampLimit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(MAX_LIMIT_PER_RUN, Math.floor(raw));
}

async function loadSitemap(baseUrl: string): Promise<string[]> {
  if (sitemapCache && Date.now() - sitemapCache.fetchedAt < SITEMAP_CACHE_TTL_MS) {
    return sitemapCache.urls;
  }
  const urls = await fetchProductUrls(baseUrl, { locale: GLOBALIRAQ_LOCALE });
  sitemapCache = { fetchedAt: Date.now(), urls };
  return urls;
}

/**
 * Loop-back call into the public admin route so spec validation, EAV
 * persistence, audit logging, and storefront revalidation all run exactly
 * as if a human admin had clicked save. The admin route guard accepts the
 * per-process internal-actor header (`internalActorHeaders`) — in-process
 * only, no network and no legacy cookie involved.
 */
/** Pull the offending keys out of a validator error like
 *  "Invalid or unknown attribute values: a, b, c". Returns [] if it's a
 *  different error we shouldn't auto-recover from. */
function parseInvalidSpecKeys(error: string | undefined): string[] {
  if (!error) return [];
  const m = /Invalid or unknown attribute values:\s*(.+)$/i.exec(error);
  if (!m) return [];
  return m[1].split(",").map((s) => s.trim()).filter(Boolean);
}

async function createProductViaAdminRoute(
  mapped: MappedProduct,
  categoryId: number,
  batchId: string,
): Promise<{ id: number; droppedSpecKeys: string[] }> {
  const p = mapped.productPayload;
  let specs: Record<string, unknown> = p.specs && typeof p.specs === "object" ? { ...p.specs } : {};
  const droppedSpecKeys: string[] = [];

  /**
   * The validator rejects spec keys that aren't in the (post-preset-resync)
   * category schema — and for categories with a canonical preset, dynamically
   * added keys can be dropped by that resync. Rather than fail the whole
   * product, we strip the rejected keys and retry. Warranty lives on its own
   * column, so the product still lands fully formed; dropped keys are recorded
   * for admin review. Bounded retries prevent an infinite loop.
   */
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const body = {
      categoryId,
      brand: p.brand || "—",
      sku: (p.sku || "").trim() || "—",
      model: typeof p.model === "string" ? p.model.trim() : "",
      quantity: Number.isFinite(p.quantity) ? p.quantity : 1,
      nameEn: p.nameEn,
      nameAr: p.nameAr || p.nameEn,
      descEn: p.descEn,
      descAr: p.descAr,
      price: p.price,
      oldPrice: p.oldPrice ?? null,
      warranty: p.warranty || null,
      specs,
      published: false,
      isNew: p.isNew !== false,
      sourceUrl: p.sourceUrl ?? null,
      sourceHandle: p.sourceHandle,
      sourcePrice: typeof p.sourcePrice === "number" ? p.sourcePrice : null,
      importedAt: new Date().toISOString(),
      importBatchId: batchId,
    };
    const req = new Request("http://127.0.0.1/internal/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json", ...internalActorHeaders("importer@globaliraq") },
      body: JSON.stringify(body),
    });
    const res = await adminProductsRoute.POST(req);
    const data = (await res.json()) as { id?: number; error?: string };
    if (res.ok && typeof data.id === "number") {
      return { id: data.id, droppedSpecKeys };
    }
    const badKeys = parseInvalidSpecKeys(data.error);
    const removable = badKeys.filter((k) => k in specs);
    if (removable.length === 0) {
      throw new Error(
        `admin POST /api/admin/products failed: ${res.status} ${data.error ?? "no id in response"}`,
      );
    }
    for (const k of removable) {
      delete specs[k];
      droppedSpecKeys.push(k);
    }
  }
  /** Last resort: post with NO specs so the product still imports. */
  specs = {};
  const res = await adminProductsRoute.POST(
    new Request("http://127.0.0.1/internal/api/admin/products", {
      method: "POST",
      headers: { "content-type": "application/json", ...internalActorHeaders("importer@globaliraq") },
      body: JSON.stringify({
        categoryId,
        brand: p.brand || "—",
        sku: (p.sku || "").trim() || "—",
        model: typeof p.model === "string" ? p.model.trim() : "",
        quantity: Number.isFinite(p.quantity) ? p.quantity : 1,
        nameEn: p.nameEn,
        nameAr: p.nameAr || p.nameEn,
        descEn: p.descEn,
        descAr: p.descAr,
        price: p.price,
        oldPrice: p.oldPrice ?? null,
        warranty: p.warranty || null,
        specs: {},
        published: false,
        isNew: p.isNew !== false,
        sourceUrl: p.sourceUrl ?? null,
        sourceHandle: p.sourceHandle,
        sourcePrice: typeof p.sourcePrice === "number" ? p.sourcePrice : null,
        importedAt: new Date().toISOString(),
        importBatchId: batchId,
      }),
    }),
  );
  const data = (await res.json()) as { id?: number; error?: string };
  if (!res.ok || typeof data.id !== "number") {
    throw new Error(`admin POST failed even with empty specs: ${res.status} ${data.error ?? ""}`);
  }
  droppedSpecKeys.push("*all-specs*");
  return { id: data.id, droppedSpecKeys };
}

async function mirrorImages(
  productId: number,
  mapped: MappedProduct,
): Promise<{ imageCount: number; localByShopifyUrl: Map<string, string> }> {
  const localByShopifyUrl = new Map<string, string>();
  let imageCount = 0;
  for (const img of mapped.images) {
    try {
      const imported = await importExternalImage(img.sourceUrl, { productId });
      const agg = await prisma.productImage.aggregate({
        where: { productId },
        _max: { sortOrder: true },
      });
      await prisma.productImage.create({
        data: {
          productId,
          url: imported.url,
          sortOrder: (agg._max.sortOrder ?? -1) + 1,
          originalSourceUrl: imported.originalSourceUrl,
        },
      });
      localByShopifyUrl.set(img.sourceUrl, imported.url);
      imageCount += 1;
    } catch (e) {
      /** Image failure does not fail the whole product — record + keep going. */
      console.error(`[import] image failed for ${img.sourceUrl}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { imageCount, localByShopifyUrl };
}

async function upsertVariants(
  productId: number,
  variants: MappedVariant[],
  localByShopifyUrl: Map<string, string>,
): Promise<number> {
  let count = 0;
  for (const v of variants) {
    const data = {
      sku: v.sku || "",
      labelEn: v.labelEn || "",
      labelAr: v.labelAr || v.labelEn || "",
      priceOverride: v.priceOverride,
      oldPrice: v.oldPrice,
      optionName1: v.optionName1,
      optionValue1: v.optionValue1,
      optionName2: v.optionName2,
      optionValue2: v.optionValue2,
      optionName3: v.optionName3,
      optionValue3: v.optionValue3,
      imageUrl: v.imageSourceUrl ? (localByShopifyUrl.get(v.imageSourceUrl) ?? null) : null,
      sourceRawJson: v.sourceRawJson as unknown as object,
      quantity: v.quantity,
      active: v.active,
      sortOrder: v.sortOrder,
    };
    if (v.sourceVariantId) {
      const existing = await prisma.productVariant.findFirst({
        where: { productId, sourceVariantId: v.sourceVariantId },
        select: { id: true },
      });
      if (existing) {
        await prisma.productVariant.update({ where: { id: existing.id }, data });
      } else {
        await prisma.productVariant.create({
          data: { ...data, productId, sourceVariantId: v.sourceVariantId },
        });
      }
    } else {
      await prisma.productVariant.create({ data: { ...data, productId, sourceVariantId: null } });
    }
    count += 1;
  }
  return count;
}

/**
 * Sprint 3 will flesh out the publish gates (image fetch HTTP 200, etc.).
 * Sprint 0 only flips `published` when caller asks and minimal data is present.
 */
async function maybeAutoPublish(
  productId: number,
  autoPublish: boolean,
  ctx: { mapped: MappedProduct; imageCount: number; categorySlug: string; matchedSlug: string | null },
): Promise<"published" | "draft"> {
  if (!autoPublish) return "draft";
  const p = ctx.mapped.productPayload;

  /** Gate 1: at least one ProductImage actually persisted with a local /uploads/ URL.
   *  This proves the image was mirrored into FreeZone storage (importExternalImage
   *  only ever returns a /uploads/... path), so it is served from our own origin. */
  const localImages = await prisma.productImage.count({
    where: { productId, url: { startsWith: "/uploads/" } },
  });

  const okay =
    ctx.imageCount > 0 &&
    localImages > 0 &&
    !!p.nameAr &&
    !!p.nameEn &&
    p.price > 0 &&
    /** Only auto-publish into a smart-matched real category, never into needs-review. */
    ctx.matchedSlug !== null &&
    ctx.categorySlug !== "needs-review" &&
    Object.keys(p.specs).length > 0 &&
    !!p.warranty;
  if (!okay) return "draft";
  await prisma.product.update({ where: { id: productId }, data: { published: true } });
  return "published";
}
