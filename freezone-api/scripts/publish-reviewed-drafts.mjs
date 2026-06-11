#!/usr/bin/env node
/**
 * One-time: review + publish the imported products that the auto-classifier left
 * in `needs-review` (they failed autoPublish only because no category matched).
 *
 * Reviewed decision (owner-approved): create ONE new `networking` category for
 * routers/switches/mesh; map everything else onto the closest existing category;
 * publish every product that has a name + price + at least one local image; hold
 * (recategorize but DO NOT publish) any product still missing an image.
 *
 *   node scripts/publish-reviewed-drafts.mjs            # dry run (no writes)
 *   node scripts/publish-reviewed-drafts.mjs --confirm  # apply
 *
 * Classification is deterministic keyword matching over brand + nameEn, with a
 * tiny explicit override map for items the rules can't cleanly catch. Safe to
 * re-run: it only ever touches products currently in `needs-review`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CONFIRM = process.argv.includes("--confirm");

// Ordered rules: first match wins, most specific first. Validated against the
// full needs-review set (see the ship session review).
const RULES = [
  ["software", /\b(windows\s*11|windows license|kaspersky|office\s*365|antivirus|license key|microsoft 365)\b/i],
  ["printers", /\b(scanner|shredder|filament|3d printing|\bams\b|\bcfs\b|\bpei\b|imageformula)\b/i],
  ["cctv", /\b(hikvision|colorvu|bullet network camera|ip camera|surveillance|dash ?cam|dashcam)\b/i],
  ["security", /\b(doorbell|video doorphone|smart lock|fingerprint lock|alarm|eufycam|solocam|indoor cam|security camera|doorphone|video calling camera)\b/i],
  ["networking", /\b(router|whole home mesh|mesh (system|wi)|\bdeco\b|\barcher\b|tl-(sg|wr|wa)|range extender|access point|\bnvr\b|wi-?fi \d[^a-z]*(router|system|mesh|extender)|gigabit (desktop|rackmount|desktop\/rackmount) switch|switch,? \d+[- ]port|switch, gigabit|desktop switch|rackmount switch)\b/i],
  ["smart-home", /\b(smart tv|\btv\b|qled|uled|mini[- ]led 4k|air purifier|robot va?cc?uum|\bva?cc?uum\b|find my|locator|pintag|pinlock|pinpop|tracker|mijia)\b/i],
  ["monitors", /\b(monitor|xeneon|projector|\d{2,3}\s*hz inch|\(\d{3,4}\s*x\s*\d{3,4}\)|\bfhd\b|\bqhd\b|\bwqhd\b|\bdqhd\b|2k \(|4k \(|5k \(|\bips\b.*\b(flat|curved)\b|\bva\b.*\b(flat|curved)\b|\d{2,3}\s*hz.*\b(ips|va|oled|flat|curved)\b)\b/i],
  ["components", /\b(motherboard|mainboard|z890|x870|b860|z790|z690|trx40|wifi7|psu|power supply|\d{3,4}\s*w\b|80\+|fully modular|full modular|semi module|non modular|mid tower|micro tower|\btower\b|chassis|tempered glass|airflow|atx \d|e-atx|m-atx|mag pano|pano m\d|cooler|cooling|liquid freezer|\bfreezer\b|waterforce|ryujin|ryuo|strix lc|tuf gaming lc| lc i{2,3}\b|\d{3} argb|argb lcd|peerless|trofeo|wonder vision|hyper vision|stream vision|valor odin|xigmatek vision|expansion card|thermal pad|mounting kit|radeon|rx 9070|geforce|\brtx\b|\bgtx\b|aorus.*ice|\bnas\b|drivestor|flashstor|diskstation|rackstation|lockerstor|server -|\baio\b)\b/i],
  ["electric", /\b(electric screwdriver|screwdriver|blower|banknote counter)\b/i],
  ["accessories", /\b(hub|card reader|web ?cam|webcam|web camera|hd camera|usb camera|mousepad|mouse pad|wrist rest|\bpad\b|led strip|light strip|graphic.*tablet|drawing tablet|signature pad|presenter|capture card|sharing switch|screen mirroring|stylus|\bpen\b|\bstand\b|power bank|powerbank|earbuds|speakers?|soundbar|soundcore|headset|headphone|backpack|\bbag\b|union a-cb|blower bag|charger|converter|action cam|osmo|insta360|graphic drawing|slim pen|magnetic wireless)\b/i],
];
const OVERRIDES = {
  1122: "accessories", 1123: "accessories", 1229: "accessories",
  1939: "smart-home", 2046: "accessories",
};
const FALLBACK = "accessories";

function classify(it) {
  if (OVERRIDES[it.id]) return OVERRIDES[it.id];
  const hay = `${it.brand || ""} ${it.nameEn || ""}`;
  for (const [slug, re] of RULES) if (re.test(hay)) return slug;
  return FALLBACK;
}

async function ensureNetworkingCategory() {
  const existing = await prisma.category.findUnique({ where: { slug: "networking" } });
  if (existing) return existing.id;
  if (!CONFIRM) {
    console.log("[dry-run] would CREATE category networking (الشبكات)");
    return -1;
  }
  const maxSort = await prisma.category.aggregate({ _max: { sortOrder: true }, where: { slug: { not: "needs-review" } } });
  const created = await prisma.category.create({
    data: {
      slug: "networking",
      nameEn: "Networking",
      nameAr: "الشبكات",
      icon: "Wifi",
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
      active: true,
    },
  });
  console.log(`✓ created networking category id=${created.id}`);
  return created.id;
}

async function main() {
  const netId = await ensureNetworkingCategory();
  const cats = await prisma.category.findMany({ select: { id: true, slug: true } });
  const slugToId = new Map(cats.map((c) => [c.slug, c.id]));
  if (netId > 0) slugToId.set("networking", netId);

  const drafts = await prisma.product.findMany({
    where: { published: false, deletedAt: null, sourceHandle: { not: null }, category: { slug: "needs-review" } },
    select: { id: true, nameEn: true, brand: true, price: true, _count: { select: { images: true } } },
    orderBy: { id: "asc" },
  });

  const dist = {};
  let recategorized = 0, published = 0;
  const held = [];

  for (const d of drafts) {
    const slug = classify(d);
    dist[slug] = (dist[slug] || 0) + 1;
    const targetCatId = slugToId.get(slug);
    const publishable = d._count.images > 0 && d.price > 0 && !!(d.nameEn && d.nameEn.trim());
    if (!publishable) held.push({ id: d.id, slug, reason: d._count.images === 0 ? "no-image" : "incomplete", name: d.nameEn });

    if (CONFIRM) {
      if (targetCatId && targetCatId > 0) {
        await prisma.product.update({ where: { id: d.id }, data: { categoryId: targetCatId } });
        recategorized++;
      }
      if (publishable) {
        await prisma.product.update({ where: { id: d.id }, data: { published: true, catalogStatus: "PUBLISHED" } });
        published++;
      }
    } else {
      recategorized++;
      if (publishable) published++;
    }
  }

  console.log(`\n=== ${CONFIRM ? "APPLIED" : "DRY RUN"} ===`);
  console.log("category distribution:", JSON.stringify(dist));
  console.log(`recategorized: ${recategorized} | published: ${published} | held (not published): ${held.length}`);
  if (held.length) console.log("held:", JSON.stringify(held));
  // The storefront catalog cache (in the API process) has a 60s SWR TTL, so the
  // newly published products surface within ~1 minute without a restart.
}

main()
  .catch((e) => { console.error("ERR", e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
