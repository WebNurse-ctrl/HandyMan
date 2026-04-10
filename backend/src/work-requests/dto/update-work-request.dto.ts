import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Priority, WorkRequestStatus } from '@prisma/client';

export class UpdateWorkRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @ApiPropertyOptional({ enum: WorkRequestStatus })
  @IsOptional()
  @IsEnum(WorkRequestStatus)
  status?: WorkRequestStatus;

  @ApiPropertyOptional({ description: 'Reason for rejection' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({ description: 'Bundle ID to group requests' })
  @IsOptional()
  @IsUUID()
  bundleId?: string;
}
