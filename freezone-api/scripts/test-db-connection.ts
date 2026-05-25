import dotenv from "dotenv";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

dotenv.config({ path: path.join(process.cwd(), ".env") });
dotenv.config({ path: path.join(process.cwd(), "..", "freezone-web", ".env") });

const prisma = new PrismaClient();
try {
  const [cats, prods] = await Promise.all([prisma.category.count(), prisma.product.count()]);
  console.log(`OK DATABASE_URL connected — categories: ${cats}, products: ${prods}`);
} catch (e) {
  console.error("FAIL", e instanceof Error ? e.message : e);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
