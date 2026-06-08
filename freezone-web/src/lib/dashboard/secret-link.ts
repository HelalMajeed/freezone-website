/**
 * Secret-link helpers for dashboard admin access.
 *
 * The dashboard has no username/password. Entry is via a private link that
 * carries a secret token in the `key` query param. These helpers are pure so
 * they can be unit-tested without a DOM; the React LoginPage consumes them.
 */

/** Extract the secret access key from a location search string, or null. */
export function readAccessKey(search: string | null | undefined): string | null {
  if (!search) return null;
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const value = new URLSearchParams(qs).get("key");
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Build a search string with the `key` param removed (so the secret can be
 * stripped from the address bar after a successful sign-in). Returns "" when no
 * params remain, otherwise a leading-"?" query string.
 */
export function searchWithoutKey(search: string | null | undefined): string {
  const qs = (search ?? "").replace(/^\?/, "");
  const params = new URLSearchParams(qs);
  params.delete("key");
  const rest = params.toString();
  return rest ? `?${rest}` : "";
}
