import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { CategoriesModule } from "./categories/categories.module";
import { AttributesModule } from "./attributes/attributes.module";

@Module({
  imports: [PrismaModule, CategoriesModule, AttributesModule],
})
export class AppModule {}
