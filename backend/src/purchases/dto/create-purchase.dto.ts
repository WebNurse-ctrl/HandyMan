import { IsString, IsOptional, IsEnum, IsUUID, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseType } from '@prisma/client';

export class CreatePurchaseDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workRequestId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiProperty()
  @IsNumber()
  estimatedCost: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ enum: PurchaseType })
  @IsOptional()
  @IsEnum(PurchaseType)
  type?: PurchaseType;
}

export class ApprovePurchaseDto {
  @ApiProperty()
  approved: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  comment?: string;
}
