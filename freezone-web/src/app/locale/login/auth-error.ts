import { CustomerAuthError } from "@/lib/storefront-user";

/** Map an auth failure to its message key in the `Auth` i18n namespace. */
export function authErrorMessageKey(err: unknown): string {
  if (err instanceof CustomerAuthError) {
    switch (err.code) {
      case "INVALID_CREDENTIALS":
      case "MISSING_CREDENTIALS":
        return "errInvalidCredentials";
      case "ACCOUNT_LOCKED":
        return "errAccountLocked";
      case "ACCOUNT_BLOCKED":
        return "errAccountBlocked";
      case "PHONE_TAKEN":
        return "errPhoneTaken";
      case "INVALID_PHONE":
        return "errInvalidPhone";
      case "WEAK_PASSWORD":
        return "errWeakPassword";
      case "RATE_LIMITED":
        return "errRateLimited";
      case "NETWORK":
        return "errNetwork";
      default:
        return "errGeneric";
    }
  }
  return "errGeneric";
}
