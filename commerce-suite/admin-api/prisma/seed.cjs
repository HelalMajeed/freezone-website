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

  let root = await prisma.catalogCategory.findFirst({
    where: { slug: "electronics", parentId: null },
  });
  if (!root) {
    root = await prisma.catalogCategory.create({
      data: {
        slug: "electronics",
        nameEn: "Electronics",
        nameAr: "إلكترونيات",
        sortOrder: 0,
      },
    });
  } else {
    root = await prisma.catalogCategory.update({
      where: { id: root.id },
      data: { nameEn: "Electronics", nameAr: "إلكترونيات", sortOrder: 0 },
    });
  }

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

  const subServices = [
    {
      id: "subsvc_install",
      nameEn: "Installation",
      nameAr: "تركيب",
      descriptionEn: "On-site installation",
      descriptionAr: "تركيب في الموقع",
      isOffer: false,
      sortOrder: 0,
    },
    {
      id: "subsvc_warranty_ext",
      nameEn: "Extended warranty",
      nameAr: "ضمان ممتد",
      descriptionEn: "12-month extension",
      descriptionAr: "تمديد 12 شهرًا",
      isOffer: true,
      sortOrder: 1,
    },
    {
      id: "subsvc_delivery",
      nameEn: "Express delivery",
      nameAr: "توصيل سريع",
      descriptionEn: "Same-week delivery",
      descriptionAr: "توصيل خلال الأسبوع",
      isOffer: true,
      sortOrder: 2,
    },
  ];
  for (const s of subServices) {
    await prisma.subService.upsert({
      where: { id: s.id },
      update: {
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        descriptionEn: s.descriptionEn,
        descriptionAr: s.descriptionAr,
        isOffer: s.isOffer,
        sortOrder: s.sortOrder,
      },
      create: {
        id: s.id,
        nameEn: s.nameEn,
        nameAr: s.nameAr,
        descriptionEn: s.descriptionEn,
        descriptionAr: s.descriptionAr,
        isOffer: s.isOffer,
        sortOrder: s.sortOrder,
        active: true,
      },
    });
  }

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
