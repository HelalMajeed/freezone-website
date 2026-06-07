import dns from "node:dns/promises";
import { isIP } from "node:net";

/** A validated external URL together with the resolved public IP it points at.
 *  Callers pin the outbound socket to `address` to close the DNS-rebind window
 *  between validation and connection. */
export type SafeResolved = { url: URL; address: string; family: number };

function ipv4IsBlocked(ip: string): boolean {
  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const o = parts.map((p) => Number(p));
  if (o.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = o;
  if (a === 0) return true; // 0.0.0.0/8 ("this network")
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 10) return true; // 10.0.0.0/8 private
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local + cloud metadata
  if (a === 192 && b === 168) return true; // 192.168.0.0/16 private
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 private
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  return false;
}

/** True for loopback / private / link-local / metadata / ULA addresses,
 *  including IPv4-mapped and IPv4-compatible IPv6 forms. */
function isPrivateOrBlockedIp(ip: string): boolean {
  let v = ip.trim().toLowerCase();
  const pct = v.indexOf("%"); // strip IPv6 zone id, e.g. fe80::1%eth0
  if (pct >= 0) v = v.slice(0, pct);

  const fam = isIP(v);
  if (fam === 4) return ipv4IsBlocked(v);
  if (fam === 6) {
    if (v === "::1" || v === "::") return true; // loopback / unspecified
    // IPv4-mapped (::ffff:a.b.c.d) and -compatible (::a.b.c.d) dotted forms
    const dotted = v.match(/:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (dotted) return ipv4IsBlocked(dotted[1]);
    // IPv4-mapped hex form, e.g. ::ffff:7f00:1
    const hex = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (hex) {
      const hi = parseInt(hex[1], 16);
      const lo = parseInt(hex[2], 16);
      const d = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
      return ipv4IsBlocked(d);
    }
    if (v.startsWith("fc") || v.startsWith("fd")) return true; // fc00::/7 unique-local
    if (/^fe[89ab]/.test(v)) return true; // fe80::/10 link-local
    return false;
  }
  return false; // not an IP literal
}

/** URL.hostname wraps IPv6 literals in brackets ("[::1]"); strip them so the
 *  value can be passed to isIP / IP-range checks. */
function hostnameToIpLiteral(host: string): string {
  return host.replace(/^\[/, "").replace(/\]$/, "");
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  const lit = hostnameToIpLiteral(h);
  if (isIP(lit) && isPrivateOrBlockedIp(lit)) return true;
  return false;
}

/**
 * Validate a URL is safe to fetch and resolve it to a public IP.
 *  - http/https only
 *  - hostname is not localhost / a blocked IP literal
 *  - EVERY DNS answer must be public (a single private answer rejects the host)
 * Returns the URL plus a resolved public address to pin the socket to.
 */
export async function resolveSafeExternalUrl(raw: string): Promise<SafeResolved> {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new Error("INVALID_URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("INVALID_PROTOCOL");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new Error("BLOCKED_HOST");
  }

  const ipLiteral = hostnameToIpLiteral(url.hostname);
  const literal = isIP(ipLiteral);
  if (literal) {
    if (isPrivateOrBlockedIp(ipLiteral)) throw new Error("BLOCKED_IP");
    return { url, address: ipLiteral, family: literal };
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new Error("DNS_FAILED");
  }
  if (records.length === 0) throw new Error("DNS_FAILED");
  for (const r of records) {
    if (isPrivateOrBlockedIp(r.address)) throw new Error("BLOCKED_DNS");
  }
  const first = records[0];
  return { url, address: first.address, family: first.family };
}

/** Backwards-compatible wrapper: validate only, discard the resolved IP. */
export async function assertSafeExternalUrl(raw: string): Promise<URL> {
  return (await resolveSafeExternalUrl(raw)).url;
}

export function isExternalHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
