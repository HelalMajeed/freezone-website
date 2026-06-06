# API Contracts — Rebuild Wave (WS1)

**Status: FROZEN.** Every contract in this file is the agreed interface between the backend
stream (WS1) and the frontend streams. Frontend agents code against this file — do not change
request/response shapes without bumping the contract here first and noting the change in the
changelog at the bottom.

These contracts extend the patterns already in the codebase (see `freezone-api/prisma/schema.prisma`,
`freezone-api/src/app/api/admin/**`, `freezone-api/src/app/api/dashboard/**`, and
`docs/API_ALIGNMENT.md`). They do **not** redefine endpoints that already exist and are unchanged.

---

## 0. Conventions (apply to every contract below)

- **Routing**: routes are auto-mounted from `freezone-api/src/app/api/**/route.ts`
  (folder path = URL path, `[id]` folder = `:id` param). Adding an endpoint = adding a
  `route.ts` file; `server.ts` is never edited.
- **Envelope (new/changed endpoints)**: success → `{ "ok": true, "data": <payload> }`
  (helper `jsonOk` in `src/lib/dashboard-guard.ts`); failure →
  `{ "ok": false, "error": "<CODE>", ... }` with an appropriate HTTP status (`jsonError`).
  Pre-existing endpoints that return bare JSON keep their current shape unless a contract
  below explicitly changes them.
- **Error codes** (string constants, HTTP status in parens): `UNAUTHORIZED` (401),
  `FORBIDDEN` (403), `NOT_FOUND` (404), `VALIDATION` (400), `CONFLICT` (409),
  `RATE_LIMITED` (429), `NO_DATABASE` (503), `INTERNAL_ERROR` (500).
- **Auth**: `/api/admin/*` accepts the legacy `fz_admin_session` HMAC cookie **or** a
  dashboard session (`fz_dashboard_session`) via the existing route guards
  (`guardAdminRead` / `guardAdminMutate`). `/api/public/*` is unauthenticated.
  Mutations write `AuditLog` via `logAdminAction`.
- **Dates**: ISO-8601 UTC strings (`"2026-06-06T10:20:30.000Z"`). Date-range query params
  `from` / `to` accept `YYYY-MM-DD` or full ISO; `from` is inclusive from 00:00:00, `to` is
  inclusive through 23:59:59.999 of that day (server normalizes).
- **Money**: integer IQD (no decimals), matching `Order.total`, `Product.price`, etc.
- **Pagination**: query `page` (1-based, default `1`) and `pageSize` (default `25`, max `100`).
  Paginated payloads always include `page`, `pageSize`, `total`, `totalPages`.
- **Bilingual**: every user-facing string is stored/returned as an `…En` + `…Ar` pair.
- **IDs**: numbers in JSON (Prisma autoincrement), except cuid string IDs where noted.

---

## (a) GET `/api/admin/orders` — paginated orders list  `FROZEN`

> **Breaking change** to the current endpoint (today it returns a bare array of ≤200 orders).
> The dashboard orders page must move to this shape in the same wave.

**Query params** (all optional):

| Param | Type | Notes |
|---|---|---|
| `page`, `pageSize` | int | standard pagination |
| `search` | string | matches `orderNumber`, `customerName`, `customerPhone` (case-insensitive, contains) |
| `status` | string | one of `pending\|confirmed\|processing\|shipped\|delivered\|cancelled` |
| `payment` | string | matches `paymentMethod` exactly (e.g. `cod`, `zaincash`) |
| `from`, `to` | date | filter on `createdAt` (see Conventions) |
| `sort` | string | `createdAt_desc` (default) \| `createdAt_asc` \| `total_desc` \| `total_asc` |

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 1042,
        "orderNumber": "FZ-01042",
        "status": "processing",
        "fulfillment": "delivery",
        "paymentMethod": "cod",
        "customerName": "علي حسن",
        "customerPhone": "07701234567",
        "city": "Baghdad",
        "itemCount": 3,
        "subtotal": 1250000,
        "shipping": 5000,
        "discountTotal": 50000,
        "total": 1205000,
        "couponCode": "EID10",
        "createdAt": "2026-06-01T09:12:00.000Z",
        "updatedAt": "2026-06-02T10:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 25,
    "total": 412,
    "totalPages": 17,
    "totals": {
      "count": 412,
      "revenue": 512300000,
      "discount": 8200000,
      "shipping": 2060000,
      "aov": 1243446
    }
  }
}
```

- `totals` is computed over the **filtered set** (not just the current page); `revenue` =
  sum of `total` excluding `cancelled` orders; `aov` = `revenue / non-cancelled count`
  (integer, 0 when no orders).
- `itemCount` = sum of line `qty`.

Errors: `401 UNAUTHORIZED`, `503 NO_DATABASE`.

---

## (b) GET `/api/admin/orders/:id` — order detail with timeline + notes  `FROZEN`

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "id": 1042,
    "orderNumber": "FZ-01042",
    "status": "processing",
    "fulfillment": "delivery",
    "paymentMethod": "cod",
    "customerName": "علي حسن",
    "customerPhone": "07701234567",
    "customerEmail": null,
    "addressLine": "حي الجامعة، شارع 14",
    "city": "Baghdad",
    "subtotal": 1250000,
    "shipping": 5000,
    "discountTotal": 50000,
    "total": 1205000,
    "couponCode": "EID10",
    "notes": "اتصال قبل التوصيل",
    "createdAt": "2026-06-01T09:12:00.000Z",
    "updatedAt": "2026-06-02T10:00:00.000Z",
    "items": [
      {
        "id": 5001,
        "productId": 311,
        "nameSnapshot": "لابتوب ROG Strix G16",
        "priceSnapshot": 1250000,
        "qty": 1,
        "imageSnapshot": "/uploads/products/rog-g16.webp",
        "product": { "id": 311, "slug": "rog-strix-g16", "nameEn": "ROG Strix G16", "nameAr": "روج ستركس G16" }
      }
    ],
    "statusHistory": [
      {
        "id": 9001,
        "kind": "status",
        "fromStatus": "pending",
        "toStatus": "confirmed",
        "note": null,
        "userId": 3,
        "userEmail": "ops@freezone-iq.com",
        "createdAt": "2026-06-01T10:00:00.000Z"
      }
    ],
    "internalNotes": [
      {
        "id": 9002,
        "kind": "note",
        "fromStatus": null,
        "toStatus": null,
        "note": "Customer asked to deliver after 6pm",
        "userId": 3,
        "userEmail": "ops@freezone-iq.com",
        "createdAt": "2026-06-01T10:05:00.000Z"
      }
    ]
  }
}
```

- `statusHistory` = `OrderStatusEvent` rows with `kind: "status"`, ascending `createdAt`.
- `internalNotes` = `OrderStatusEvent` rows with `kind: "note"`, ascending `createdAt`.
  Internal notes are **never** exposed on any public endpoint.
- `items[].product` is `null` when the product was hard-deleted.

Errors: `401`, `404 NOT_FOUND`, `503`.

### PATCH `/api/admin/orders/:id` — status transition  `FROZEN`

Request: `{ "status": "shipped" }` (same allowed set as today). Writes an
`OrderStatusEvent` (`kind: "status"`, `fromStatus` → `toStatus`) and audit log.
Transition to `"cancelled"` via PATCH is rejected with `409 CONFLICT`
(`{"ok":false,"error":"USE_CANCEL_ENDPOINT"}`) — cancellation must go through (c) so stock
restore is explicit. Response 200: `{ "ok": true, "data": { "id": 1042, "status": "shipped" } }`.

> The legacy `PATCH /api/admin/orders` (body `{id,status}`) keeps working during the wave but
> is **deprecated**; it gains the same OrderStatusEvent write and the same `cancelled` rejection.

### POST `/api/admin/orders/:id/notes` — add internal note  `FROZEN`

Request: `{ "text": "..." }` (1–2000 chars, trimmed, required).
Response 201: `{ "ok": true, "data": { <OrderStatusEvent row, kind:"note"> } }`.

---

## (c) POST `/api/admin/orders/:id/cancel` — cancel with stock restore  `FROZEN`

**Request body** (all optional):

```json
{ "reason": "Customer changed mind", "restoreStock": true }
```

- `restoreStock` defaults to `true`.

**Behavior** (single transaction):
1. Reject if order already `cancelled` → `409 CONFLICT` `{"ok":false,"error":"ALREADY_CANCELLED"}`.
2. Reject if order `delivered` → `409 CONFLICT` `{"ok":false,"error":"ALREADY_DELIVERED"}`.
3. Set `status = "cancelled"`.
4. If `restoreStock`: for each line with a still-existing product, `quantity += qty`,
   set `inStock = true` when quantity becomes > 0, and write one `StockMovement`
   (`delta = +qty`, `reason = "order_cancelled_restore"`, `orderId`).
5. Write `OrderStatusEvent` (`kind: "status"`, `toStatus: "cancelled"`, `note = reason`).
6. If a coupon was used, decrement `Coupon.usedCount` (floor 0).
7. Audit log `order.cancel`.

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "id": 1042,
    "status": "cancelled",
    "stockRestored": [ { "productId": 311, "qty": 1 } ]
  }
}
```

`stockRestored` is `[]` when `restoreStock:false` or no products could be restored.

---

## (d) GET `/api/admin/orders/export` — CSV export  `FROZEN`

Accepts the **same filter params as (a)** (`search`, `status`, `payment`, `from`, `to`) —
no pagination; hard cap 10 000 rows (rows beyond the cap are dropped, newest first).

**Response 200**: `Content-Type: text/csv; charset=utf-8`,
`Content-Disposition: attachment; filename="orders-<YYYYMMDD>-<YYYYMMDD>.csv"`.
Body starts with a UTF-8 BOM (Excel + Arabic). Frozen column order:

```
orderNumber,status,fulfillment,paymentMethod,customerName,customerPhone,city,addressLine,itemCount,subtotal,shipping,discountTotal,total,couponCode,createdAt
```

- `createdAt` in ISO-8601 UTC. Strings are RFC-4180 quoted/escaped. Header row always present
  (an empty result returns header only).

---

## (e) Persistent notifications  `FROZEN`

### GET `/api/admin/notifications`

> Extends the current endpoint **additively** — the existing counter fields
> (`pendingReview`, `newComments`, `categoriesNoAttrs`, `role`) are retained so the current
> dashboard badge keeps working.

Query: `page`, `pageSize` (default 25, max 100), `unreadOnly` (`true|false`, default `false`),
`type` (optional exact match).

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 71,
        "type": "order.created",
        "titleEn": "New order FZ-01042",
        "titleAr": "طلب جديد FZ-01042",
        "bodyEn": "علي حسن — 1,205,000 IQD",
        "bodyAr": "علي حسن — 1,205,000 د.ع",
        "href": "/dashboard/orders/1042",
        "entity": "Order",
        "entityId": "1042",
        "payloadJson": null,
        "readAt": null,
        "createdAt": "2026-06-06T08:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 25,
    "total": 64,
    "totalPages": 3,
    "unreadCount": 12,
    "pendingReview": 4,
    "newComments": 2,
    "categoriesNoAttrs": 1,
    "role": "SUPER_ADMIN"
  }
}
```

Notification `type` values (frozen vocabulary, extend-only):
`order.created`, `order.cancelled`, `stock.low`, `stock.out`, `review.pending`,
`contact.message`, `system`.

Visibility: a row is visible to a user when `recipientId` is `null` (broadcast) or equals the
current `AdminUser.id`. Read state lives on the row (`readAt`) — acceptable for the small ops
team; broadcast rows are marked read globally (documented tradeoff).

### POST `/api/admin/notifications/mark-read`

Request — exactly one of:

```json
{ "ids": [71, 72] }
```
```json
{ "all": true }
```

Sets `readAt = now()` on the matching **visible, unread** rows.
Response 200: `{ "ok": true, "data": { "updated": 2 } }`.
`400 VALIDATION` when neither/both fields supplied or `ids` empty/over 200 entries.

---

## (f) GET `/api/admin/dashboard/analytics` — range analytics  `FROZEN`

> New endpoint. The existing `GET /api/admin/dashboard` (catalog health) and
> `GET /api/admin/dashboard-stats` are unchanged.

Query: `from`, `to` (default: last 30 days ending today), `compare` (`true|false`, default
`true` — adds the immediately-preceding period of equal length).

Cancelled orders are excluded from **all** revenue/AOV/unit numbers; they appear only in
`totals.cancelledOrders`.

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "range": { "from": "2026-05-07", "to": "2026-06-06" },
    "previousRange": { "from": "2026-04-06", "to": "2026-05-06" },
    "totals": {
      "revenue": 512300000,
      "orders": 412,
      "aov": 1243446,
      "units": 980,
      "discount": 8200000,
      "shipping": 2060000,
      "cancelledOrders": 18
    },
    "previous": {
      "revenue": 423000000,
      "orders": 350,
      "aov": 1208571,
      "units": 800,
      "discount": 6100000,
      "shipping": 1750000,
      "cancelledOrders": 11
    },
    "delta": {
      "revenuePct": 21.1,
      "ordersPct": 17.7,
      "aovPct": 2.9,
      "unitsPct": 22.5
    },
    "revenueByDay": [
      { "date": "2026-05-07", "revenue": 14200000, "orders": 12 }
    ],
    "revenueByCategory": [
      { "categoryId": 3, "slug": "laptops", "nameEn": "Laptops", "nameAr": "لابتوبات", "revenue": 210000000, "units": 160, "sharePct": 41.0 }
    ],
    "revenueByBrand": [
      { "brandId": 7, "slug": "asus", "nameEn": "ASUS", "nameAr": "أسوس", "revenue": 120000000, "units": 95, "sharePct": 23.4 }
    ],
    "salesByCity": [
      { "city": "Baghdad", "orders": 240, "revenue": 300000000 }
    ],
    "couponPerformance": [
      { "code": "EID10", "labelEn": "Eid 10%", "labelAr": "عيد ١٠٪", "uses": 38, "discountTotal": 4200000, "revenue": 51000000 }
    ],
    "topProducts": [
      { "productId": 311, "slug": "rog-strix-g16", "nameEn": "ROG Strix G16", "nameAr": "روج ستركس G16", "units": 22, "revenue": 27500000 }
    ]
  }
}
```

- `previous` / `previousRange` are `null` when `compare=false`.
- `delta.*Pct` is `null` when the previous value is 0; otherwise rounded to 1 decimal.
- Category/brand attribution uses each line item's product's **current** primary
  category/brand (line items don't snapshot category); products deleted since the sale group
  under `categoryId: null` / `brandId: null` with `slug: null`, names `"(deleted)"` / `"(محذوف)"`.
- `revenueByDay` covers every day in the range (zero-filled). Lists capped: categories/brands
  20, cities 20, coupons 20, topProducts 10 (each sorted by revenue desc).

---

## (g) Audit-log filtering + per-entity history  `FROZEN`

### GET `/api/admin/audit-log`

> Extends the current endpoint. Envelope stays `{ ok, data }`; `data.rows` (alias of `items`)
> and `data.nextCursor` are retained but **deprecated** — new consumers use `items` + pages.

Query: `page`, `pageSize` (default 50, max 200), `entity` (e.g. `Product`, `Order`),
`entityId` (string), `user` (matches `userEmail` contains, case-insensitive, or exact
`userId` when numeric), `action` (exact, e.g. `product.bulk`), `from`, `to` (on `createdAt`).

**Response 200**:

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": 880,
        "action": "order.cancel",
        "entity": "Order",
        "entityId": "1042",
        "payload": { "reason": "Customer changed mind" },
        "userId": 3,
        "userEmail": "ops@freezone-iq.com",
        "ip": "203.0.113.9",
        "userAgent": "Mozilla/5.0 ...",
        "createdAt": "2026-06-02T10:00:00.000Z"
      }
    ],
    "page": 1,
    "pageSize": 50,
    "total": 4120,
    "totalPages": 83,
    "rows": [],
    "nextCursor": null
  }
}
```

(`rows` mirrors `items`; shown empty above only for brevity.)

### GET `/api/admin/audit-log/:entity/:entityId`

Convenience per-entity history (`route.ts` at `audit-log/[entity]/[entityId]/`). Same item
shape, ascending `createdAt`, `pageSize` default 100 max 200:

```json
{ "ok": true, "data": { "items": [ ... ], "page": 1, "pageSize": 100, "total": 6, "totalPages": 1 } }
```

---

## (h) Public endpoints  `FROZEN`

### POST `/api/public/orders/track` — order tracking

Rate limit: 10/min/IP (scope `public/order-track`).

Request: `{ "orderNumber": "FZ-01042", "phone": "07701234567" }` — both required.
Phone match: digits-only normalization, compare last 9 digits (tolerates `+964` / leading 0).

Response 200 (sanitized — no address, no internal notes, no customer email):

```json
{
  "ok": true,
  "data": {
    "orderNumber": "FZ-01042",
    "status": "processing",
    "fulfillment": "delivery",
    "city": "Baghdad",
    "createdAt": "2026-06-01T09:12:00.000Z",
    "subtotal": 1250000,
    "shipping": 5000,
    "discountTotal": 50000,
    "total": 1205000,
    "items": [ { "name": "لابتوب ROG Strix G16", "qty": 1, "image": "/uploads/products/rog-g16.webp" } ],
    "timeline": [
      { "status": "pending", "at": "2026-06-01T09:12:00.000Z" },
      { "status": "confirmed", "at": "2026-06-01T10:00:00.000Z" }
    ]
  }
}
```

- `timeline` = order creation (`pending`) + `OrderStatusEvent` rows of `kind:"status"`
  (only `toStatus` + `createdAt`), ascending.
- Wrong number **or** wrong phone both return `404 NOT_FOUND` (no oracle on which was wrong).

### GET `/api/public/search-suggestions?q=<term>&limit=<n>`

`q` required, min 2 chars after trim (else `data` with empty arrays); `limit` caps products
(default 8, max 10). Matches `nameEn`/`nameAr`/`brand`/`model`/`sku` contains-insensitive on
published, non-deleted products. Response `Cache-Control: public, max-age=60`.

```json
{
  "ok": true,
  "data": {
    "products": [
      { "id": 311, "slug": "rog-strix-g16", "nameEn": "ROG Strix G16", "nameAr": "روج ستركس G16", "price": 1250000, "salePrice": null, "image": "/uploads/products/rog-g16-w200.webp" }
    ],
    "categories": [ { "id": 3, "slug": "laptops", "nameEn": "Laptops", "nameAr": "لابتوبات" } ],
    "brands": [ { "id": 7, "slug": "asus", "nameEn": "ASUS", "nameAr": "أسوس" } ],
    "queries": [ "rog strix", "rog ally" ]
  }
}
```

Categories/brands capped at 4 each; `queries` (popular-term echo) may be `[]` — it is a
best-effort field, never an error.

### GET `/api/public/sitemap.xml`

Returns `application/xml`, `Cache-Control: public, max-age=3600`. Standard `<urlset>` with:
static pages (`/`, `/products`, `/contact`, `/about`), every **published, non-deleted**
product with a slug (`/products/<slug>`, `<lastmod>` = `updatedAt`), every active category
(`/products?category=<slug>`), every active brand (`/products?brand=<slug>`). Absolute URLs
on `https://freezone-iq.com` (override base with env `PUBLIC_SITE_ORIGIN`).

### POST `/api/public/contact` — contact form

Rate limit: 5/min/IP (scope `public/contact`).

Request:

```json
{
  "name": "علي",
  "phone": "07701234567",
  "email": "ali@example.com",
  "subject": "استفسار",
  "message": "هل يتوفر ...؟"
}
```

`name` (1–120), `phone` (5–20 chars) and `message` (5–4000) required; `email`/`subject`
optional. Server strips HTML. Persists a broadcast `Notification`
(`type: "contact.message"`, `payloadJson` = the submitted fields) so it lands in the
dashboard inbox, and writes an audit row (`action: "contact.submit"`).

Response 201: `{ "ok": true, "data": { "id": 88 } }` (`id` = Notification id).

---

## (i) POST `/api/admin/products/bulk` — new actions  `FROZEN`

> Additive to the existing endpoint. Existing actions and the existing response shape
> (`{ ok: true, action, affected }` — note: **no** `data` envelope, kept for compatibility)
> are unchanged. Existing validation (1–200 unique positive int ids) applies.

### Action `catalog_status`

```json
{ "action": "catalog_status", "ids": [1, 2, 3], "catalogStatus": "PENDING_REVIEW" }
```

`catalogStatus` ∈ `DRAFT | PENDING_REVIEW | CHANGES_REQUESTED | PUBLISHED | ARCHIVED`.
Allowed transitions (per product, from current status):

| From | Allowed targets |
|---|---|
| `DRAFT` | `PENDING_REVIEW`, `ARCHIVED` |
| `PENDING_REVIEW` | `PUBLISHED`, `CHANGES_REQUESTED`, `ARCHIVED` |
| `CHANGES_REQUESTED` | `PENDING_REVIEW`, `ARCHIVED` |
| `PUBLISHED` | `ARCHIVED`, `CHANGES_REQUESTED` |
| `ARCHIVED` | `DRAFT` |

Side effects: → `PUBLISHED` also sets `published = true`; → `ARCHIVED` sets
`published = false`. Role guard: only `CATALOG_MANAGER` / `SUPER_ADMIN` may target
`PUBLISHED` (editors get the row reported in `skipped` with reason `forbidden_transition`).

Products whose current status does not allow the target are **skipped, not failed**:

```json
{ "ok": true, "action": "catalog_status", "affected": 2, "skipped": [ { "id": 3, "reason": "invalid_transition" } ] }
```

### Action `change_brand`

```json
{ "action": "change_brand", "ids": [1, 2], "brandId": 7 }
```

- `brandId` must reference an existing `Brand` (else `404 {"error":"target brand not found"}`),
  **or** `null` to clear the brand link.
- Sets `brandId` and syncs the legacy display string `Product.brand` to the brand's `nameEn`
  (empty string when clearing).

Response: `{ "ok": true, "action": "change_brand", "affected": 2 }`.

---

## (j) CMS homepage section payloads  `FROZEN`

Sections live in `CmsPageSection` (`type` + `draftPayload` / `publishedPayload` JSON).
The storefront reads **published** payloads via `GET /api/ssr/home-sections`; the dashboard
CMS editor writes drafts via the existing `cms-page` endpoints. The five payload schemas
below are the frozen editor⇄storefront interface (they extend the existing defaults in
`src/lib/cms-section-defaults.ts`). Unknown extra keys must be ignored by renderers.
Every `id` inside payload arrays is a client-generated stable string (for drag/drop + React keys).

### `banner_slider`

```jsonc
{
  "autoplayMs": 6000,            // 0 = no autoplay; 2000–20000
  "aspect": "wide",              // "wide" (21:9-ish) | "banner" (4:1 strip)
  "items": [                     // 1..10
    {
      "id": "b1",
      "titleAr": "عروض الصيف", "titleEn": "Summer deals",
      "subAr": "", "subEn": "",                 // optional subtitle
      "badgeAr": "", "badgeEn": "",             // optional small badge
      "imageUrl": "/uploads/cms/banner1.webp",  // required
      "imageUrlMobile": "",                     // optional portrait crop
      "href": "/products?sale=true",            // required
      "active": true
    }
  ]
}
```

### `categories_showcase`

```jsonc
{
  "source": "manual",            // "gaming_grid" (legacy preset) | "manual"
  "titleAr": "تسوق حسب القسم", "titleEn": "Shop by category",
  "items": [                     // manual mode: 2..12; ignored for "gaming_grid"
    {
      "id": "c1",
      "categorySlug": "laptops",            // resolves image/name from Category when set
      "labelAr": "", "labelEn": "",         // optional override of category name
      "imageUrl": "",                       // optional override of category background
      "href": ""                            // optional override (default /products?category=<slug>)
    }
  ]
}
```

### `promo_grid`

```jsonc
{
  "layout": "2x2",               // "2x2" | "3x1" | "1+2" (one large + two stacked)
  "items": [                     // 1..6
    {
      "id": "p1",
      "titleAr": "كروت الشاشة", "titleEn": "Graphics cards",
      "subAr": "", "subEn": "",
      "ctaAr": "تسوق الآن", "ctaEn": "Shop now",   // optional button label
      "imageUrl": "/uploads/cms/gpu.webp",          // required
      "href": "/products?category=components",      // required
      "catSlug": ""                                 // optional category association
    }
  ]
}
```

### `tabbed_products`

```jsonc
{
  "eyebrowAr": "المنتجات المميزة", "eyebrowEn": "Featured products",
  "titleAr": "اكتشف أحدث التقنيات", "titleEn": "Discover the latest tech",
  "viewAllLink": "/products",
  "limit": 24,                   // products per tab, 4..48
  "tabStyle": "grouped",         // "grouped" | "underline"
  "tabs": [                      // 1..6
    {
      "id": "t-new",
      "labelAr": "الوافدون الجدد", "labelEn": "New Arrivals",
      "mode": "new",             // "new" | "featured" | "gaming" | "components"
                                 //   | "category" | "brand" | "manual"
      "categorySlug": "",        // required when mode = "category"
      "brandSlug": "",           // required when mode = "brand"
      "productIds": []           // required when mode = "manual" (1..48 ids)
    }
  ]
}
```

### `faq`

```jsonc
{
  "source": "manual",            // "i18n" (legacy translation-file copy) | "manual"
  "titleAr": "أسئلة شائعة", "titleEn": "FAQ",
  "items": [                     // manual mode: 1..20
    {
      "id": "q1",
      "qAr": "كم تستغرق مدة التوصيل؟", "qEn": "How long does delivery take?",
      "aAr": "من ١ إلى ٣ أيام عمل داخل بغداد.", "aEn": "1–3 business days in Baghdad."
    }
  ]
}
```

---

## (k) New Prisma models  `FROZEN`

To be added to `freezone-api/prisma/schema.prisma` (one migration). Relations to add on
existing models: `Order.statusEvents OrderStatusEvent[]`, `Order.stockMovements StockMovement[]`,
`Product.stockMovements StockMovement[]`, `AdminUser.notifications Notification[]`.

```prisma
/// Append-only order timeline: status transitions AND internal staff notes.
model OrderStatusEvent {
  id         Int      @id @default(autoincrement())
  orderId    Int
  order      Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  /// "status" (fromStatus -> toStatus) | "note" (internal note, statuses null)
  kind       String   @default("status")
  fromStatus String?
  toStatus   String?
  note       String?  @db.Text
  userId     Int?
  userEmail  String?
  createdAt  DateTime @default(now())

  @@index([orderId, createdAt])
  @@index([kind, createdAt])
}

/// Persistent dashboard notification. recipientId null = broadcast to all admins
/// (read-state on broadcast rows is global — acceptable for a small ops team).
model Notification {
  id          Int        @id @default(autoincrement())
  recipientId Int?
  recipient   AdminUser? @relation(fields: [recipientId], references: [id], onDelete: Cascade)
  /// order.created | order.cancelled | stock.low | stock.out | review.pending | contact.message | system
  type        String
  titleEn     String
  titleAr     String
  bodyEn      String     @default("")
  bodyAr      String     @default("")
  /// Dashboard deep-link, e.g. /dashboard/orders/1042
  href        String?
  entity      String?
  entityId    String?
  payloadJson Json?
  readAt      DateTime?
  createdAt   DateTime   @default(now())

  @@index([recipientId, readAt, createdAt(sort: Desc)])
  @@index([type, createdAt])
}

/// Append-only inventory ledger. delta < 0 = stock out (sale), delta > 0 = stock in.
model StockMovement {
  id        Int      @id @default(autoincrement())
  productId Int
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  delta     Int
  /// order_placed | order_cancelled_restore | manual_adjust | import | correction
  reason    String
  orderId   Int?
  order     Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  qtyBefore Int?
  qtyAfter  Int?
  userId    Int?
  userEmail String?
  note      String?
  createdAt DateTime @default(now())

  @@index([productId, createdAt])
  @@index([orderId])
  @@index([reason, createdAt])
}
```

Write paths that must create `StockMovement` rows once the model lands:
`POST /api/public/orders` (`order_placed`, negative delta per line),
`POST /api/admin/orders/:id/cancel` (`order_cancelled_restore`),
any admin quantity edit (`manual_adjust`), importer (`import`).

---

## New rate-limit rules (additions to `RATE_LIMITS` in `server.ts`)  `FROZEN`

| Key | Limit |
|---|---|
| `POST /api/public/orders/track` | 10 / 60s |
| `POST /api/public/contact` | 5 / 60s |

---

## Changelog

- **2026-06-06** — Initial freeze (WS1): contracts (a)–(k) above.
