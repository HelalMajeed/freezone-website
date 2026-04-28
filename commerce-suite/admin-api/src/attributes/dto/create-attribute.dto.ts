import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Matches, MaxLength, Min } from "class-validator";

const TYPES = ["text", "select", "color", "number", "boolean"] as const;

export class CreateAttributeDto {
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z][a-z0-9_]*$/)
  key!: string;

  @IsString()
  @MaxLength(255)
  nameEn!: string;

  @IsString()
  @MaxLength(255)
  nameAr!: string;

  @IsString()
  @IsIn(TYPES as unknown as string[])
  type!: (typeof TYPES)[number];

  @IsOptional()
  options?: unknown;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
