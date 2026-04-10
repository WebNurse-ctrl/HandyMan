import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Priority } from '@prisma/client';

export class CreateWorkRequestDto {
  @ApiProperty({ description: 'Title of the work request' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Detailed description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Campus ID' })
  @IsUUID()
  campusId: string;

  @ApiPropertyOptional({ description: 'Location ID within the campus' })
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ description: 'Category ID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ enum: Priority, description: 'Priority level' })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
