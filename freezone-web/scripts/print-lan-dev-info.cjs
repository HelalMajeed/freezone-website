/**
 * Prints URLs to open this dev stack from another PC on the LAN.
 * Run: npm run lan:info
 */
const os = require("os");

function isPrivateIPv4(addr) {
  if (!addr || addr === "127.0.0.1") return false;
  if (addr.startsWith("10.")) return true;
  if (addr.startsWith("192.168.")) return true;
  const m = addr.match(/^172\.(\d+)\./);
  if (m) {
    const n = parseInt(m[1], 10);
    return n >= 16 && n <= 31;
  }
  return false;
}

function isLikelyVirtualSwitch(name) {
  const n = String(name);
  return /default switch|vethernet|hyper-v|virtualbox|vmware|vmnet|host-only|wsl|npcap|docker desktop|zerotier/i.test(
    n,
  );
}

function collectLanIPv4() {
  const nets = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    if (isLikelyVirtualSwitch(name)) continue;
    for (const net of nets[name] || []) {
      if (net.family !== "IPv4" && net.family !== 4) continue;
      if (net.internal) continue;
      if (isPrivateIPv4(net.address)) out.push({ name, address: net.address });
    }
  }
  /** Prefer typical LAN ranges so users do not pick a Hyper-V IP that other PCs cannot route to. */
  out.sort((a, b) => {
    const score = (addr) => {
      if (addr.startsWith("192.168.")) return 0;
      if (addr.startsWith("10.")) return 1;
      return 2;
    };
    return score(a.address) - score(b.address);
  });
  return out;
}

const rows = collectLanIPv4();
const webPort = process.env.VITE_DEV_PORT || "3000";
const apiPort = process.env.API_PORT || "4000";

console.log("");
console.log("[lan] Open the storefront from another PC on the same Wi‑Fi/LAN:");
if (rows.length === 0) {
  console.log("  (No private IPv4 found — connect Wi‑Fi/Ethernet or set VITE_PUBLIC_SITE_URL.)");
} else {
  for (const { name, address } of rows) {
    console.log(`  ${name}:  http://${address}:${webPort}/`);
    console.log(`           API health: http://${address}:${apiPort}/`);
  }
}
console.log("");
console.log("[lan] If the other PC cannot connect, allow inbound TCP on this machine:");
console.log("      npm run lan:firewall");
console.log("      (Run PowerShell as Administrator — see script output if it fails.)");
console.log("");
