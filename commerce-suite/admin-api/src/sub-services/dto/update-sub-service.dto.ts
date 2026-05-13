import { IsBoolean, IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateSubServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nameAr?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  descriptionAr?: string;

  @IsOptional()
  @IsBoolean()
  isOffer?: boolean;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
