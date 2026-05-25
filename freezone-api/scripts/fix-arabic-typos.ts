/**
 * Data fix: common Arabic spelling mistakes in category/product names.
 * Run: npx tsx scripts/fix-arabic-typos.ts
 */
import { prisma } from "../src/lib/prisma";

const FIXES: { from: string; to: string }[] = [
  { from: "الالعاب", to: "الألعاب" },
  { from: "الاسلامي", to: "الإسلامي" },
  { from: "الالكترونيات", to: "الإلكترونيات" },
  { from: "الادوات", to: "الأدوات" },
  { from: "الاحذية", to: "الأحذية" },
  { from: "الاطفال", to: "الأطفال" },
  { from: "الانارة", to: "الإنارة" },
  { from: "الانترنت", to: "الإنترنت" },
  { from: "الاواني", to: "الأواني" },
  { from: "الابواب", to: "الأبواب" },
  { from: "الاثاث", to: "الأثاث" },
  { from: "الاجهزة", to: "الأجهزة" },
  { from: "الاكسسوارات", to: "الإكسسوارات" },
  { from: "الالمنيوم", to: "الألمنيوم" },
  { from: "الامن", to: "الأمن" },
  { from: "الانجليزية", to: "الإنجليزية" },
  { from: "الايفون", to: "الآيفون" },
  { from: "الايباد", to: "الآيباد" },
];

function replaceAll(text: string, from: string, to: string): string {
  return text.split(from).join(to);
}

async function main() {
  let categoryUpdates = 0;
  let productUpdates = 0;

  for (const fix of FIXES) {
    const cats = await prisma.category.findMany({
      where: { nameAr: { contains: fix.from } },
      select: { id: true, nameAr: true },
    });
    for (const c of cats) {
      const next = replaceAll(c.nameAr, fix.from, fix.to);
      if (next !== c.nameAr) {
        await prisma.category.update({ where: { id: c.id }, data: { nameAr: next } });
        categoryUpdates++;
        console.log(`Category #${c.id}: ${fix.from} → ${fix.to}`);
      }
    }

    const products = await prisma.product.findMany({
      where: { nameAr: { contains: fix.from } },
      select: { id: true, nameAr: true },
      take: 500,
    });
    for (const p of products) {
      const next = replaceAll(p.nameAr, fix.from, fix.to);
      if (next !== p.nameAr) {
        await prisma.product.update({ where: { id: p.id }, data: { nameAr: next } });
        productUpdates++;
      }
    }
  }

  console.log(`Done. categories=${categoryUpdates} products=${productUpdates}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
