import { Body, Controller, Get, Patch, Param, Query } from "@nestjs/common";
import { SubServicesService } from "./sub-services.service";
import { UpdateSubServiceDto } from "./dto/update-sub-service.dto";
import { ReorderSubServicesDto } from "./dto/reorder-sub-services.dto";

@Controller("admin/sub-services")
export class AdminSubServicesController {
  constructor(private readonly subServices: SubServicesService) {}

  @Get()
  findAll(@Query("filter") filter?: string) {
    const f = filter === "offers" ? "offers" : "all";
    return this.subServices.findAllAdmin(f);
  }

  @Patch("reorder/batch")
  reorder(@Body() dto: ReorderSubServicesDto) {
    return this.subServices.reorder(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSubServiceDto) {
    return this.subServices.update(id, dto);
  }
}
