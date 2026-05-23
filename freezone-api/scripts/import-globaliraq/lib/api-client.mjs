// Minimal HTTP client for the FreeZone admin API. Talks to whatever base URL
// you point it at (local: http://127.0.0.1:4000, prod: https://freezone-website.fly.dev).
//
// All endpoints require an admin session cookie. The flow is:
//   await login(baseUrl, password) -> { cookie }
//   await importImage(baseUrl, cookie, src) -> { url, originalSourceUrl, ... }
//   await createProduct(baseUrl, cookie, body) -> { product: { id, ... } }
//   await attachImages(baseUrl, cookie, productId, urls) -> updated product
//
// No retries / backoff yet — the importer caller is the place to add those if
// the API ever starts returning 429.

export class AdminApiError extends Error {
  constructor(status, body, url) {
    super(`${url} -> ${status}`);
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export async function login(baseUrl, password) {
  if (!password) throw new Error("Admin password is required (set FREEZONE_ADMIN_PASSWORD).");
  const url = trimBase(baseUrl) + "/api/admin/login";
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password }),
  });
  const raw = await res.text();
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
  if (!res.ok) throw new AdminApiError(res.status, body, url);

  /** Set-Cookie may carry multiple cookies — pick the session one. */
  const setCookie = (typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : (res.headers.get("set-cookie") || "").split(/,(?=\s*\w+=)/));
  const sessionEntry = setCookie.find((c) => c.startsWith("fz_admin_session="));
  if (!sessionEntry) throw new Error(`Login OK but no fz_admin_session cookie in response (${url}).`);
  const cookie = sessionEntry.split(";")[0];
  return { cookie };
}

export async function listCategories(baseUrl, cookie) {
  return await getJson(baseUrl, cookie, "/api/admin/categories");
}

export async function listBrands(baseUrl, cookie) {
  return await getJson(baseUrl, cookie, "/api/admin/brands");
}

export async function createCategory(baseUrl, cookie, { nameEn, nameAr }) {
  return await postJson(baseUrl, cookie, "/api/admin/categories", { nameEn, nameAr: nameAr || nameEn });
}

export async function createBrand(baseUrl, cookie, { nameEn, nameAr }) {
  return await postJson(baseUrl, cookie, "/api/admin/brands", { nameEn, nameAr: nameAr || nameEn });
}

/**
 * Pull an external image into FreeZone storage. Returns { url, originalSourceUrl, ... }.
 * Set `productId` to have the server immediately create a ProductImage row.
 */
export async function importImage(baseUrl, cookie, { src, productId, alt }) {
  return await postJson(baseUrl, cookie, "/api/admin/media/import-image", {
    url: src,
    productId,
    alt,
  });
}

export async function createProduct(baseUrl, cookie, payload) {
  return await postJson(baseUrl, cookie, "/api/admin/products", payload);
}

export async function attachImages(baseUrl, cookie, productId, images) {
  return await postJson(baseUrl, cookie, `/api/admin/products/${productId}/images`, {
    images: images.map((i) => ({ url: i.url, originalSourceUrl: i.originalSourceUrl })),
  });
}

async function getJson(baseUrl, cookie, path) {
  const url = trimBase(baseUrl) + path;
  const res = await fetch(url, { headers: { cookie } });
  return await parse(res, url);
}

async function postJson(baseUrl, cookie, path, body) {
  const url = trimBase(baseUrl) + path;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
  return await parse(res, url);
}

async function parse(res, url) {
  const raw = await res.text();
  let body;
  try { body = raw ? JSON.parse(raw) : {}; } catch { body = { raw }; }
  if (!res.ok) throw new AdminApiError(res.status, body, url);
  return body;
}

function trimBase(b) { return b.replace(/\/$/, ""); }
