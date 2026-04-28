import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { AttributesService } from "./attributes.service";
import { CreateAttributeDto } from "./dto/create-attribute.dto";
import { UpdateAttributeDto } from "./dto/update-attribute.dto";

@Controller("attributes")
export class AttributesController {
  constructor(private readonly attributes: AttributesService) {}

  @Get()
  findAll() {
    return this.attributes.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.attributes.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAttributeDto) {
    return this.attributes.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateAttributeDto) {
    return this.attributes.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.attributes.remove(id);
  }
}
