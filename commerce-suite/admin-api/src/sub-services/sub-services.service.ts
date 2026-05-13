import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateSubServiceDto } from "./dto/update-sub-service.dto";
import { ReorderSubServicesDto } from "./dto/reorder-sub-services.dto";

export type SubServiceRow = {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  isOffer: boolean;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class SubServicesService {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    nameEn: string;
    nameAr: string;
    descriptionEn: string;
    descriptionAr: string;
    isOffer: boolean;
    sortOrder: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): SubServiceRow {
    return { ...row };
  }

  async findAllAdmin(filter?: "all" | "offers") {
    const where =
      filter === "offers"
        ? { isOffer: true as const }
        : {};

    const rows = await this.prisma.subService.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    });
    return rows.map((r) => this.map(r));
  }

  async findPublicOffers(): Promise<SubServiceRow[]> {
    const rows = await this.prisma.subService.findMany({
      where: { active: true, isOffer: true },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    });
    return rows.map((r) => this.map(r));
  }

  async update(id: string, dto: UpdateSubServiceDto) {
    try {
      const row = await this.prisma.subService.update({
        where: { id },
        data: dto,
      });
      return this.map(row);
    } catch {
      throw new NotFoundException(`SubService ${id} not found`);
    }
  }

  async reorder(dto: ReorderSubServicesDto) {
    const { orderedIds } = dto;
    const existing = await this.prisma.subService.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true },
    });
    if (existing.length !== orderedIds.length) {
      throw new NotFoundException("One or more sub-service ids are invalid");
    }

    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.subService.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.findAllAdmin("all");
  }
}
