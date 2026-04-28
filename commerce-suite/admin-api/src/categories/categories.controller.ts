import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ReorderCategoriesDto } from "./dto/reorder-categories.dto";
import { BulkDeleteCategoriesDto } from "./dto/bulk-delete-categories.dto";

@Controller("categories")
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get("search")
  search(@Query("q") q?: string) {
    if (!q?.trim()) return [];
    return this.categories.search(q.trim());
  }

  @Get()
  findAll(@Query("format") format?: "flat" | "tree") {
    return this.categories.findAll(format === "tree" ? "tree" : "flat");
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categories.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @Patch("reorder/batch")
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categories.reorder(dto);
  }

  @Post("bulk-delete")
  bulkDelete(@Body() dto: BulkDeleteCategoriesDto) {
    return this.categories.bulkDelete(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categories.remove(id);
  }
}
