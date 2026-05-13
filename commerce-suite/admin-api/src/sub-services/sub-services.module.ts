import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SubServicesService } from "./sub-services.service";
import { AdminSubServicesController } from "./admin-sub-services.controller";
import { OffersPublicController } from "./offers-public.controller";

@Module({
  imports: [PrismaModule],
  controllers: [AdminSubServicesController, OffersPublicController],
  providers: [SubServicesService],
  exports: [SubServicesService],
})
export class SubServicesModule {}
