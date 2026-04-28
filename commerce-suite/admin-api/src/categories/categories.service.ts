import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { ReorderCategoriesDto } from "./dto/reorder-categories.dto";
import { BulkDeleteCategoriesDto } from "./dto/bulk-delete-categories.dto";

export type CategoryFlat = {
  id: string;
  parentId: string | null;
  slug: string;
  nameEn: string;
  nameAr: string;
  imageUrl: string | null;
  sortOrder: number;
  active: boolean;
  attributeIds: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryTreeNode = CategoryFlat & { children: CategoryTreeNode[] };

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapFlat(
    row: Prisma.CatalogCategoryGetPayload<{
      include: { attributes: { select: { attributeId: true; sortOrder: true } } };
    }>,
  ): CategoryFlat {
    return {
      id: row.id,
      parentId: row.parentId,
      slug: row.slug,
      nameEn: row.nameEn,
      nameAr: row.nameAr,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      active: row.active,
      attributeIds: row.attributes.map((a) => a.attributeId),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private buildTree(flat: CategoryFlat[]): CategoryTreeNode[] {
    const nodes = new Map<string, CategoryTreeNode>();
    for (const c of flat) {
      nodes.set(c.id, { ...c, children: [] });
    }
    const roots: CategoryTreeNode[] = [];
    for (const c of flat) {
      const node = nodes.get(c.id)!;
      if (c.parentId && nodes.has(c.parentId)) {
        nodes.get(c.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }
    const sortKids = (n: CategoryTreeNode) => {
      n.children.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
      n.children.forEach(sortKids);
    };
    roots.sort((a, b) => a.sortOrder - b.sortOrder || a.slug.localeCompare(b.slug));
    roots.forEach(sortKids);
    return roots;
  }

  private includeAttrs() {
    return {
      attributes: {
        orderBy: { sortOrder: "asc" as const },
        select: { attributeId: true, sortOrder: true },
      },
    };
  }

  async findAll(format: "flat" | "tree" = "flat") {
    const rows = await this.prisma.catalogCategory.findMany({
      include: this.includeAttrs(),
      orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }, { slug: "asc" }],
    });
    const flat = rows.map((r) => this.mapFlat(r));
    if (format === "tree") {
      return { tree: this.buildTree(flat) };
    }
    return { flat };
  }

  async search(q: string) {
    return this.prisma.catalogCategory.findMany({
      where: {
        OR: [
          { nameEn: { contains: q, mode: "insensitive" } },
          { nameAr: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
        ],
      },
      take: 30,
      orderBy: [{ sortOrder: "asc" }, { slug: "asc" }],
      select: {
        id: true,
        parentId: true,
        slug: true,
        nameEn: true,
        nameAr: true,
      },
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.catalogCategory.findUnique({
      where: { id },
      include: this.includeAttrs(),
    });
    if (!row) throw new NotFoundException("Category not found");
    return this.mapFlat(row);
  }

  async assertUniqueSlug(parentId: string | null | undefined, slug: string, excludeId?: string) {
    const existing = await this.prisma.catalogCategory.findFirst({
      where: {
        parentId: parentId ?? null,
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    });
    if (existing) {
      throw new ConflictException(`Slug "${slug}" already exists under this parent`);
    }
  }

  async assertParent(parentId?: string | null) {
    if (!parentId) return;
    const p = await this.prisma.catalogCategory.findUnique({ where: { id: parentId } });
    if (!p) throw new BadRequestException("Parent category not found");
  }

  async create(dto: CreateCategoryDto) {
    await this.assertParent(dto.parentId ?? null);
    await this.assertUniqueSlug(dto.parentId ?? null, dto.slug);
    const sortOrder =
      dto.sortOrder ??
      (await this.prisma.catalogCategory.count({
        where: { parentId: dto.parentId ?? null },
      }));

    return this.prisma.$transaction(async (tx) => {
      if (dto.attributeIds?.length) {
        const n = await tx.catalogAttribute.count({ where: { id: { in: dto.attributeIds } } });
        if (n !== dto.attributeIds.length) {
          throw new BadRequestException("One or more attributeIds are invalid");
        }
      }
      const created = await tx.catalogCategory.create({
        data: {
          parentId: dto.parentId ?? null,
          slug: dto.slug,
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          imageUrl: dto.imageUrl ?? null,
          sortOrder,
          active: dto.active ?? true,
        },
      });
      if (dto.attributeIds?.length) {
        await tx.catalogCategoryAttribute.createMany({
          data: dto.attributeIds.map((attributeId, i) => ({
            categoryId: created.id,
            attributeId,
            sortOrder: i,
          })),
          skipDuplicates: true,
        });
      }
      const full = await tx.catalogCategory.findUniqueOrThrow({
        where: { id: created.id },
        include: this.includeAttrs(),
      });
      return this.mapFlat(full);
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const currentRow = await this.prisma.catalogCategory.findUniqueOrThrow({
      where: { id },
      include: this.includeAttrs(),
    });
    const current = this.mapFlat(currentRow);
    const nextParent = dto.parentId !== undefined ? dto.parentId : current.parentId;
    const nextSlug = dto.slug ?? current.slug;
    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) throw new BadRequestException("Category cannot be its own parent");
      await this.assertParent(dto.parentId);
    }
    if (dto.slug !== undefined || dto.parentId !== undefined) {
      await this.assertUniqueSlug(nextParent ?? null, nextSlug, id);
    }
    return this.prisma.$transaction(async (tx) => {
      if (dto.attributeIds?.length) {
        const n = await tx.catalogAttribute.count({ where: { id: { in: dto.attributeIds } } });
        if (n !== dto.attributeIds.length) {
          throw new BadRequestException("One or more attributeIds are invalid");
        }
      }
      await tx.catalogCategory.update({
        where: { id },
        data: {
          parentId: dto.parentId,
          slug: dto.slug,
          nameEn: dto.nameEn,
          nameAr: dto.nameAr,
          imageUrl: dto.imageUrl,
          sortOrder: dto.sortOrder,
          active: dto.active,
        },
      });
      if (dto.attributeIds) {
        await tx.catalogCategoryAttribute.deleteMany({ where: { categoryId: id } });
        if (dto.attributeIds.length) {
          await tx.catalogCategoryAttribute.createMany({
            data: dto.attributeIds.map((attributeId, i) => ({
              categoryId: id,
              attributeId,
              sortOrder: i,
            })),
          });
        }
      }
      const full = await tx.catalogCategory.findUniqueOrThrow({
        where: { id },
        include: this.includeAttrs(),
      });
      return this.mapFlat(full);
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.catalogCategory.delete({ where: { id } });
    return { ok: true };
  }

  async bulkDelete(dto: BulkDeleteCategoriesDto) {
    await this.prisma.catalogCategory.deleteMany({
      where: { id: { in: dto.ids } },
    });
    return { ok: true, deleted: dto.ids.length };
  }

  async reorder(dto: ReorderCategoriesDto) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.catalogCategory.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId === undefined ? undefined : item.parentId,
            sortOrder: item.sortOrder,
          },
        }),
      ),
    );
    return this.findAll("flat");
  }
}
