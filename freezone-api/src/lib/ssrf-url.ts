import dns from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateOrBlockedIp(ip: string): boolean {
  const v = ip.toLowerCase();
  if (v === "127.0.0.1" || v === "::1" || v === "0.0.0.0" || v === "::") return true;
  if (v === "localhost" || v.endsWith(".localhost")) return true;
  if (v.startsWith("10.")) return true;
  if (v.startsWith("192.168.")) return true;
  if (v.startsWith("169.254.")) return true;
  if (v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true;
  if (v.startsWith("172.")) {
    const parts = v.split(".");
    const second = parseInt(parts[1] ?? "", 10);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "0.0.0.0") return true;
  if (isIP(h) && isPrivateOrBlockedIp(h)) return true;
  return false;
}

/** Validate URL is safe to fetch (http/https only, no private networks). */
export async function assertSafeExternalUrl(raw: string): Promise<URL> {
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
  if (isIP(url.hostname) && isPrivateOrBlockedIp(url.hostname)) {
    throw new Error("BLOCKED_IP");
  }
  try {
    const records = await dns.lookup(url.hostname, { all: true });
    for (const r of records) {
      if (isPrivateOrBlockedIp(r.address)) {
        throw new Error("BLOCKED_DNS");
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("BLOCKED")) throw e;
    throw new Error("DNS_FAILED");
  }
  return url;
}

export function isExternalHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}
