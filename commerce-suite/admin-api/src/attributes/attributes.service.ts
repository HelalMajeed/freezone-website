import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateAttributeDto } from "./dto/create-attribute.dto";
import { UpdateAttributeDto } from "./dto/update-attribute.dto";

@Injectable()
export class AttributesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.catalogAttribute.findMany({
      orderBy: [{ sortOrder: "asc" }, { key: "asc" }],
    });
  }

  async findOne(id: string) {
    const row = await this.prisma.catalogAttribute.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Attribute not found");
    return row;
  }

  async create(dto: CreateAttributeDto) {
    const exists = await this.prisma.catalogAttribute.findUnique({ where: { key: dto.key } });
    if (exists) throw new ConflictException("Attribute key already exists");
    return this.prisma.catalogAttribute.create({
      data: {
        key: dto.key,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type,
        options: dto.options === undefined ? undefined : (dto.options as object),
        sortOrder: dto.sortOrder ?? 0,
        active: dto.active ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateAttributeDto) {
    await this.findOne(id);
    if (dto.key) {
      const clash = await this.prisma.catalogAttribute.findFirst({
        where: { key: dto.key, NOT: { id } },
      });
      if (clash) throw new ConflictException("Attribute key already exists");
    }
    return this.prisma.catalogAttribute.update({
      where: { id },
      data: {
        key: dto.key,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        type: dto.type,
        options: dto.options === undefined ? undefined : (dto.options as object),
        sortOrder: dto.sortOrder,
        active: dto.active,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.catalogAttribute.delete({ where: { id } });
    return { ok: true };
  }
}
