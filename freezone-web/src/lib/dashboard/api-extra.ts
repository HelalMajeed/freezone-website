/**
 * Operations-stream API client extensions (WS3-B).
 *
 * `lib/dashboard/api.ts` mirrors the frozen contracts and is consume-only;
 * everything the operations pages need beyond it lives here:
 *  - manual shipping-fee edit on an order (additive PATCH `{ shipping }`),
 *  - media library client (paginated list, register, import-from-URL),
 *  - XHR upload with per-file progress (fetch has no upload progress).
 */
import { freezoneApiUrl } from "@/lib/api-internal";
import {
  buildDashboardQuery,
  dashboardApi,
  DashboardApiError,
  type MediaAsset,
  type MediaKind,
  type MediaUpdatePayload,
  type OrderStatus,
  type Paginated,
} from "@/lib/dashboard/api";

// ─── Orders: manual shipping-fee edit ────────────────────────────────────────

export type OrderShippingUpdateResult = {
  id: number;
  status: OrderStatus;
  shipping: number;
  total: number;
};

export const ordersExtraApi = {
  /** PATCH /api/admin/orders/:id `{ shipping }` — total recomputed server-side. */
  updateShipping: (id: number, shipping: number) =>
    dashboardApi.patch<OrderShippingUpdateResult>(`/api/admin/orders/${id}`, { shipping }),
};

// ─── Media library ───────────────────────────────────────────────────────────

export type MediaListQuery = {
  page?: number;
  pageSize?: number;
  /** Matches title / url / alt text (contains, case-insensitive). */
  q?: string;
  kind?: MediaKind;
};

export type MediaListResponse = Paginated<MediaAsset>;

export type MediaRegisterPayload = {
  url: string;
  kind?: MediaKind;
  mimeType?: string;
  title?: string;
  altAr?: string;
  altEn?: string;
  fileSize?: number;
};

export type ImportedImage = {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  originalSourceUrl?: string;
};

export const mediaApi = {
  /** GET /api/admin/media?page=… — paginated envelope (additive over the legacy bare array). */
  list: (query: MediaListQuery = {}) =>
    dashboardApi.get<MediaListResponse>(
      `/api/admin/media${buildDashboardQuery({ ...query, page: query.page ?? 1 })}`,
    ),

  /** POST /api/admin/media — register an already-hosted file in the library. */
  register: (payload: MediaRegisterPayload) =>
    dashboardApi.post<MediaAsset>("/api/admin/media", payload),

  /** PATCH /api/admin/media/:id — title / alt / kind. */
  update: (id: number, payload: MediaUpdatePayload) =>
    dashboardApi.patch<{ ok: true }>(`/api/admin/media/${id}`, payload),

  /** DELETE /api/admin/media/:id — removes the library row (file stays on disk). */
  remove: (id: number) => dashboardApi.delete<{ ok: true }>(`/api/admin/media/${id}`),

  /**
   * POST /api/admin/media/import-image — server-side download of an external
   * image into `/uploads` (SSRF-guarded). Returns the hosted file metadata;
   * pair with {@link mediaApi.register} to add it to the library.
   */
  importImage: async (url: string): Promise<ImportedImage> => {
    const res = await dashboardApi.post<{ ok: true; image: ImportedImage }>(
      "/api/admin/media/import-image",
      { url },
    );
    return res.image;
  },
};

// ─── Upload with progress (XHR) ──────────────────────────────────────────────

export type UploadProgressResult = { url: string };

/**
 * Multipart upload to `/api/admin/upload` with upload-progress callbacks —
 * the fetch-based `uploadDashboardFile` cannot report progress. Registers the
 * file in the MediaAsset library when `opts.register` is true.
 */
export function uploadFileWithProgress(
  file: File,
  opts: { register?: boolean; title?: string; altAr?: string; altEn?: string },
  onProgress: (fraction: number) => void,
): Promise<UploadProgressResult> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (opts.register) form.append("registerLibrary", "true");
    if (opts.title) form.append("title", opts.title);
    if (opts.altAr) form.append("altAr", opts.altAr);
    if (opts.altEn) form.append("altEn", opts.altEn);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", freezoneApiUrl("/api/admin/upload"));
    xhr.withCredentials = true;
    xhr.responseType = "json";

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) onProgress(Math.min(1, e.loaded / e.total));
    };
    xhr.onerror = () => reject(new DashboardApiError(0, "NETWORK"));
    xhr.ontimeout = () => reject(new DashboardApiError(0, "TIMEOUT"));
    xhr.onload = () => {
      const body = (xhr.response ?? {}) as { url?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && body.url) {
        onProgress(1);
        resolve({ url: body.url });
      } else {
        reject(new DashboardApiError(xhr.status, body.error ?? `HTTP_${xhr.status}`));
      }
    };
    xhr.send(form);
  });
}
