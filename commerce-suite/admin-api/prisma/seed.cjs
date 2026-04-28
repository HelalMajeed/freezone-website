/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.adminRole.upsert({
    where: { name: "superadmin" },
    update: {},
    create: { id: "role_superadmin", name: "superadmin" },
  });

  const attrs = [
    { key: "color", nameEn: "Color", nameAr: "اللون", type: "color" },
    { key: "size", nameEn: "Size", nameAr: "المقاس", type: "select", options: [{ value: "s" }, { value: "m" }] },
    { key: "warranty", nameEn: "Warranty", nameAr: "الضمان", type: "text" },
  ];
  const createdAttrs = [];
  for (const a of attrs) {
    const row = await prisma.catalogAttribute.upsert({
      where: { key: a.key },
      update: {},
      create: {
        key: a.key,
        nameEn: a.nameEn,
        nameAr: a.nameAr,
        type: a.type,
        options: a.options ?? undefined,
      },
    });
    createdAttrs.push(row);
  }

  const root = await prisma.catalogCategory.upsert({
    where: { parentId_slug: { parentId: null, slug: "electronics" } },
    update: {},
    create: {
      slug: "electronics",
      nameEn: "Electronics",
      nameAr: "إلكترونيات",
      sortOrder: 0,
    },
  });

  const child = await prisma.catalogCategory.upsert({
    where: { parentId_slug: { parentId: root.id, slug: "laptops" } },
    update: {},
    create: {
      parentId: root.id,
      slug: "laptops",
      nameEn: "Laptops",
      nameAr: "حواسيب محمولة",
      sortOrder: 0,
    },
  });

  await prisma.catalogCategoryAttribute.deleteMany({ where: { categoryId: child.id } });
  await prisma.catalogCategoryAttribute.createMany({
    data: createdAttrs.map((attr, i) => ({
      categoryId: child.id,
      attributeId: attr.id,
      sortOrder: i,
    })),
  });

  // eslint-disable-next-line no-console
  console.log("Seed OK", { root: root.id, child: child.id });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
