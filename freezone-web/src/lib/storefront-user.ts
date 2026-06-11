import { create } from "zustand";
import { freezoneApiUrl, getInternalApiFetchSignal } from "./api-internal";

/**
 * Server-backed customer auth state (replaces the old client-only fake flag).
 *
 * Source of truth is the HttpOnly `fz_customer_session` cookie set by the API
 * (`/api/public/auth/*`). A lightweight localStorage flag remembers that this
 * device signed in so `hydrate()` only calls `GET /me` when it might succeed —
 * plain storefront browsing never pays an extra request.
 */

export type CustomerProfile = {
  id: number;
  name: string;
  phone: string;
  email: string | null;
};

export type CustomerAuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_BLOCKED"
  | "PHONE_TAKEN"
  | "INVALID_PHONE"
  | "WEAK_PASSWORD"
  | "MISSING_CREDENTIALS"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "NETWORK"
  | "GENERIC";

export class CustomerAuthError extends Error {
  code: CustomerAuthErrorCode;
  constructor(code: CustomerAuthErrorCode) {
    super(code);
    this.code = code;
    this.name = "CustomerAuthError";
  }
}

const SIGNED_IN_FLAG = "fz:customer-signed-in:v1";

function readSignedInFlag(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(SIGNED_IN_FLAG) === "1";
  } catch {
    return false;
  }
}

function writeSignedInFlag(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(SIGNED_IN_FLAG, "1");
    else window.localStorage.removeItem(SIGNED_IN_FLAG);
  } catch {
    /* private mode / quota — flag is an optimization only */
  }
}

const KNOWN_CODES: ReadonlySet<string> = new Set([
  "INVALID_CREDENTIALS",
  "ACCOUNT_LOCKED",
  "ACCOUNT_BLOCKED",
  "PHONE_TAKEN",
  "INVALID_PHONE",
  "WEAK_PASSWORD",
  "MISSING_CREDENTIALS",
  "VALIDATION",
]);

type AuthJson = { ok?: boolean; error?: string; code?: string; customer?: CustomerProfile } | null;

function errorFrom(status: number, json: AuthJson): CustomerAuthError {
  const code = json?.error;
  if (code && KNOWN_CODES.has(code)) return new CustomerAuthError(code as CustomerAuthErrorCode);
  if (json?.code === "RATE_LIMITED" || status === 429) return new CustomerAuthError("RATE_LIMITED");
  return new CustomerAuthError("GENERIC");
}

async function postAuth(path: string, body: unknown): Promise<CustomerProfile> {
  let res: Response;
  try {
    res = await fetch(freezoneApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: getInternalApiFetchSignal(),
      body: JSON.stringify(body),
    });
  } catch {
    throw new CustomerAuthError("NETWORK");
  }
  const json = (await res.json().catch(() => null)) as AuthJson;
  if (!res.ok || !json?.ok || !json.customer) throw errorFrom(res.status, json);
  return json.customer;
}

/**
 * "unknown" until `hydrate()` ran (or a login/register resolved it),
 * then "guest" or "authenticated".
 */
export type CustomerAuthStatus = "unknown" | "loading" | "guest" | "authenticated";

type StorefrontUserState = {
  status: CustomerAuthStatus;
  /** Kept for cheap header rendering (NavBar) — optimistic from the local flag, corrected by hydrate(). */
  isLoggedIn: boolean;
  customer: CustomerProfile | null;
  /** Resolve the session lazily (call on account-relevant pages only). */
  hydrate: () => Promise<void>;
  login: (phone: string, password: string) => Promise<CustomerProfile>;
  register: (input: { name: string; phone: string; password: string }) => Promise<CustomerProfile>;
  logout: () => Promise<void>;
};

export const useStorefrontUser = create<StorefrontUserState>()((set, get) => ({
  status: "unknown",
  isLoggedIn: readSignedInFlag(),
  customer: null,

  hydrate: async () => {
    const { status } = get();
    if (status !== "unknown") return;
    if (!readSignedInFlag()) {
      set({ status: "guest", isLoggedIn: false, customer: null });
      return;
    }
    set({ status: "loading" });
    let res: Response;
    try {
      res = await fetch(freezoneApiUrl("/api/public/auth/me"), {
        credentials: "include",
        signal: getInternalApiFetchSignal(),
      });
    } catch {
      /** API unreachable — show guest UI now, retry on the next mount. */
      set({ status: "unknown" });
      return;
    }
    const json = (await res.json().catch(() => null)) as AuthJson;
    if (res.ok && json?.ok && json.customer) {
      set({ status: "authenticated", isLoggedIn: true, customer: json.customer });
      return;
    }
    /** Session expired/revoked server-side — drop the stale local flag. */
    writeSignedInFlag(false);
    set({ status: "guest", isLoggedIn: false, customer: null });
  },

  login: async (phone, password) => {
    const customer = await postAuth("/api/public/auth/login", { phone, password });
    writeSignedInFlag(true);
    set({ status: "authenticated", isLoggedIn: true, customer });
    return customer;
  },

  register: async (input) => {
    const customer = await postAuth("/api/public/auth/register", input);
    writeSignedInFlag(true);
    set({ status: "authenticated", isLoggedIn: true, customer });
    return customer;
  },

  logout: async () => {
    try {
      await fetch(freezoneApiUrl("/api/public/auth/logout"), {
        method: "POST",
        credentials: "include",
        signal: getInternalApiFetchSignal(),
      });
    } catch {
      /** Cookie may outlive a failed call, but local state must be honest. */
    }
    writeSignedInFlag(false);
    set({ status: "guest", isLoggedIn: false, customer: null });
  },
}));
