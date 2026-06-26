import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateEntityDto } from './create-entity.dto';

export class UpdateEntityDto extends PartialType(CreateEntityDto) {
  @ApiPropertyOptional({
    description: 'Entity status',
    enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'],
  })
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Display sort order' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}
