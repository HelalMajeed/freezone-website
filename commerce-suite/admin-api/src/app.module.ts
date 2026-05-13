import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { CategoriesModule } from "./categories/categories.module";
import { AttributesModule } from "./attributes/attributes.module";
import { SubServicesModule } from "./sub-services/sub-services.module";

@Module({
  imports: [PrismaModule, CategoriesModule, AttributesModule, SubServicesModule],
})
export class AppModule {}
