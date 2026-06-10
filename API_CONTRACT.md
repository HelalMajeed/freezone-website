# API_CONTRACT — Global Launch Sprint (new & changed endpoints only)

Existing endpoints are inventoried in `docs/API_CONTRACTS.md` and stay unchanged
unless listed here. Every Phase 2 agent MUST conform to this contract exactly.

## Conventions (unchanged from codebase)
- Success: `{ ok: true, ... }` · Error: `{ ok: false, error: "CODE", message? }`
- Admin guards: `guardAdminRead` / `guardAdminMutate` (or `requireAdminRole`) on every
  `/api/admin/*` route; mutations call `logAdminAction` (audit) with actor + ip + ua.
- New write endpoints validate with **zod** (body, params, query).
- Money: integer IQD. Phones: normalize Arabic-indic digits, validate `^07\d{9}$`
  via the new shared helper `freezone-api/src/lib/phone.ts` (`normalizeIraqiPhone`,
  `isValidIraqiPhone`) — single source of truth, mirrored in
  `freezone-web/src/lib/phone.ts`.
- Province codes: canonical codes from `src/lib/iraq-provinces.ts` everywhere.

## 1. Admin auth (Phase 1 — built before agents fork)
| Method/Path | Auth | Notes |
|---|---|---|
| `POST /api/dashboard/auth/login` | rate-limit 5/10min | Body `{ identifier, password }` — identifier = email **or** phone (legacy `{ email, password }` still accepted). Sets `fz_dashboard_session`. Audits `auth.login` success AND failure (with ip/ua). |
| `POST /api/dashboard/auth/direct-login` | rate-limit | **Fails closed `403 DIRECT_LOGIN_DISABLED_IN_PRODUCTION` when `NODE_ENV=production`**, regardless of `ADMIN_DIRECT_LOGIN`. Non-prod behavior unchanged. |
| `POST /api/dashboard/auth/logout` | session | Now audited (`auth.logout`). |

Frontend: canonical admin path `/admin/*` (alias `/dashboard/*` redirects). Login page
at `/admin/login` renders identifier+password form; in non-prod with direct login
enabled it may auto-enter (dev convenience).

## 2. Customer auth (Agent F) — pattern copies dashboard-auth
Cookie: `fz_customer_session` (httpOnly, SameSite=Lax, Secure in prod, 30-day,
opaque token SHA-256-hashed in `CustomerSession`).

| Method/Path | Auth | Body → Response |
|---|---|---|
| `POST /api/public/auth/register` | rate 5/10min | `{ name, phone, password (≥8), email? }` → `201 { ok, customer: { id, name, phone, email } }` + cookie. Errors: `PHONE_TAKEN`, `INVALID_PHONE`, `WEAK_PASSWORD`. |
| `POST /api/public/auth/login` | rate 5/10min | `{ phone, password }` → `{ ok, customer }` + cookie. Lockout 5 fails/15min (`ACCOUNT_LOCKED`). Blocked → `403 ACCOUNT_BLOCKED`. |
| `POST /api/public/auth/logout` | cookie | Revokes session → `{ ok }` |
| `GET /api/public/auth/me` | cookie | `{ ok, customer }` or `401 UNAUTHENTICATED` |
| `GET /api/public/auth/orders` | cookie | `{ ok, orders: [...] }` — orders where `customerId` matches OR `customerPhone` equals the account phone (claims past guest orders). Same shape as order-tracking response items. |

Checkout (`POST /api/public/orders`): when a valid customer session cookie is present,
set `customerId` on the created order. NO other checkout behavior change.

## 3. Reviews — public (Agent B)
| Method/Path | Auth | Contract |
|---|---|---|
| `GET /api/public/products/:id/reviews?page=1&pageSize=10` | none | `{ ok, reviews: [{ id, customerName, rating, comment, createdAt }], total, ratingAvg, ratingCount }` — **approved only**, newest first. 404 `UNKNOWN_PRODUCT` for bad id. |
| `POST /api/public/products/:id/reviews` | rate 5/min | `{ customerName (2–60), phone (Iraqi format), rating (int 1–5), comment (10–2000) }` → `201 { ok, pending: true }`. Created `isApproved=false`. If a customer session exists, link `customerId` and default `customerName` to account name. Duplicate guard: same phone + product within 24h → `409 ALREADY_REVIEWED`. |

## 4. Reviews — moderation (Agent D)
| Method/Path | Auth | Contract |
|---|---|---|
| `GET /api/admin/reviews?status=pending|approved|all&search=&page=&pageSize=` | admin read | `{ ok, reviews: [...incl. phone, product { id, nameEn, nameAr }], total, pendingCount }` |
| `PATCH /api/admin/reviews/:id` | admin mutate + audit | `{ isApproved: boolean }` → `{ ok, review }` |
| `DELETE /api/admin/reviews/:id` | admin mutate + audit | `{ ok }` |

On approve/unapprove/delete, recompute and persist `Product.rating` (avg of approved,
1 decimal; keep existing value if zero approved) and `Product.reviews` (count of
approved) in the same transaction. Owner of recompute helper:
`freezone-api/src/lib/review-stats.ts` (Agent D creates; Agent B does NOT write it).

## 5. Customers admin (Agent D)
| Method/Path | Auth | Contract |
|---|---|---|
| `GET /api/admin/customers?search=&blocked=&page=&pageSize=` | admin read | `{ ok, customers: [{ id, name, phone, email, isBlocked, createdAt, lastLoginAt, orderCount, totalSpent }], total }` (search matches name/phone/email) |
| `GET /api/admin/customers/:id` | admin read | `{ ok, customer, orders: [...] }` (orders by customerId OR phone match) |
| `PATCH /api/admin/customers/:id` | SUPER_ADMIN mutate + audit | `{ isBlocked: boolean }` → `{ ok, customer }`. Blocking revokes all customer sessions. |

## 6. Payments (Agent C)
`freezone-api/src/lib/payments/` — `types.ts` exports:
```ts
interface PaymentProvider {
  key: "cod" | "zaincash" | "qicard" | "fib" | "card";
  isConfigured(): boolean;          // env-key based; cod always true
  createPayment(order): Promise<{ redirectUrl?: string; reference?: string }>;
  verifyCallback(payload): Promise<{ orderId: number; paid: boolean }>;
  refund(order): Promise<void>;
}
class NotConfiguredError extends Error {}   // adapters throw when unconfigured
```
Env keys (document in `freezone-api/.env.example`, never implement fake success):
`ZAINCASH_MERCHANT_ID/ZAINCASH_SECRET/ZAINCASH_MSISDN`, `QICARD_MERCHANT_ID/QICARD_API_KEY`,
`FIB_CLIENT_ID/FIB_CLIENT_SECRET`, `CARD_GATEWAY_KEY`.

| Method/Path | Auth | Contract |
|---|---|---|
| `GET /api/public/payment-methods` | none | `{ ok, methods: [{ key, enabled, comingSoon, labelEn, labelAr }] }` — `cod`/`store_pickup` always enabled; gateway methods `enabled:false, comingSoon:true` unless configured. |
| `POST /api/public/orders` (changed) | existing | `paymentMethod` validated against allowlist `cod|zaincash|qicard|fib|visa|master|store_pickup` → else `400 INVALID_PAYMENT_METHOD`. Unconfigured gateway methods are rejected (`PAYMENT_METHOD_UNAVAILABLE`) — no silent fallback. Adds zod schema for the whole body. Phone validated (`INVALID_PHONE`). Shipping fee per §7. Honest failure: client must NOT show success when the POST fails. |
| `PATCH /api/admin/orders/:id` (changed) | admin mutate + audit | Additionally accepts `{ paymentStatus: "unpaid"|"paid"|"refunded" }`; writes an `OrderStatusEvent` note recording the change. |

## 7. Shipping fees per governorate (Agent C server + D settings UI)
- Source: `SiteConfig.shippingFeesJson` (`{ [provinceCode]: feeIQD }`).
- Server recompute in order POST: `fee = shippingFeesJson?.[code] ?? standardShippingFee`;
  `0` when `fulfillment=pickup` or subtotal ≥ `freeDeliveryThreshold`.
- `GET /api/public/site` projection adds `shippingFees` (resolved full 18-code map)
  + `freeDeliveryThreshold` (already exposed) so checkout displays per-province fee.
- `PATCH /api/admin/site-config` allowlist += `shippingFeesJson` (validated map:
  known codes only, int 0–100000).
- Seed defaults: `baghdad: 5000`, all other codes `8000`.

## 8. Analytics (Agent F, frontend only)
`freezone-web/src/lib/analytics.ts`: no-op unless `VITE_GA4_ID` / `VITE_META_PIXEL_ID`
set. Exports `trackPageView`, `trackViewItem(product)`, `trackAddToCart(item, qty)`,
`trackBeginCheckout(cart)`, `trackPurchase(order)`. GA4 ecommerce param shapes; Pixel
standard events (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Purchase`).
Integration in shared components only (App router hook, cart store, PDP); checkout
page events are wired by the Orchestrator in Phase 3 to avoid file conflicts.

## 9. Contact (Agent E)
Use the EXISTING `POST /api/public/contact` (read its zod-free manual validation in
`freezone-api/src/app/api/public/contact/route.ts` and conform). No backend changes
besides optional zod tightening. Frontend must surface real success/failure.

## File-ownership matrix (conflict prevention)
| Path | Owner |
|---|---|
| `freezone-web/scripts/prerender.mjs`, `public/_redirects`, `public/_headers`, `public/robots.txt`, `src/components/seo/*` | A |
| `freezone-api/.../products/[id]/reviews/*`, `freezone-web` PDP + listing pagination + seed demo products, `freezone-api/prisma/seed*.ts`, `src/lib/data.ts` | B |
| `freezone-api/src/lib/payments/*`, `public/orders/route.ts`, `public/payment-methods/*`, `freezone-web` checkout page + confirmation, `src/lib/phone.ts` (both packages) | C |
| `freezone-web/src/routes/dashboard-routes.tsx`, `src/pages/dashboard/*`, `freezone-api/.../admin/reviews/*`, `admin/customers/*`, `admin/site-config` allowlist, `lib/review-stats.ts` | D |
| `freezone-web/src/app/locale/{about,contact}/*`, new warranty/FAQ pages, `Footer`, `NavBar`, cart drawer component, `src/messages/*` (content keys) | E |
| `freezone-api/src/server.ts` (middleware only), `freezone-web/src/lib/analytics.ts`, customer auth (api `public/auth/*` + web login/register/account pages), `vite.config.ts`, root `package.json` ci script | F |

Shared files NOT to touch in Phase 2 (Orchestrator integrates in Phase 3):
`freezone-web/src/App.tsx` (A/E/F may NOT edit; D owns the /admin route move),
`freezone-web/src/messages/en.json` + `ar.json` — each agent ADDS keys in its own
namespace only (`reviews.*`, `checkout.*`, `content.*`, `account.*`, `adminX.*`) and
never reformats the file.
