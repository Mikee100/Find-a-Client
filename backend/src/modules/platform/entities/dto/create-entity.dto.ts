import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecipeLineDto {
  @ApiProperty({ description: 'Ingredient entity ID' })
  @IsString()
  @IsNotEmpty()
  ingredientId!: string;

  @ApiProperty()
  @IsNumber()
  quantity!: number;

  @ApiProperty({ example: 'g' })
  @IsString()
  unit!: string;

  @ApiPropertyOptional({ description: 'Waste factor as a percentage, e.g. 5 = 5%' })
  @IsOptional()
  @IsNumber()
  wasteFactor?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class VariantDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ description: 'Variant attributes, e.g. { size: "L", color: "Navy" }' })
  attributes!: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  priceOverride?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  costPrice?: number;
}

export class EntityExtensionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ example: 'kg' })
  @IsOptional()
  @IsString()
  stockUnit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reorderPoint?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  reorderQty?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasVariants?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresBooking?: boolean;

  @ApiPropertyOptional({ description: 'Service duration in minutes' })
  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  requiresStaff?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  generatesKitchenTicket?: boolean;

  @ApiPropertyOptional({ example: 'GRILL' })
  @IsOptional()
  @IsString()
  prepStation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isRecipeBased?: boolean;

  @ApiPropertyOptional({
    description: 'Open extension payload — vertical-specific fields go here',
    example: { allergens: ['gluten'], serviceModePricing: { DINE_IN: 12.99 } },
  })
  @IsOptional()
  payload?: Record<string, unknown>;
}

export class CreateEntityDto {
  @ApiProperty({
    description: 'Entity type from the blueprint',
    example: 'MENU_ITEM',
  })
  @IsString()
  @IsNotEmpty()
  entityType!: string;

  @ApiProperty({ example: 'Classic Cheeseburger' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: 'FOOD_STANDARD' })
  @IsOptional()
  @IsString()
  taxClass?: string;

  @ApiPropertyOptional({ example: 12.99 })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Branch IDs this entity is available in. Empty = all branches.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  branchScope?: string[];

  @ApiPropertyOptional({ type: [String], example: ['bestseller', 'burgers'] })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => EntityExtensionDto)
  extension?: EntityExtensionDto;

  @ApiPropertyOptional({
    description: 'Recipe lines — required when extension.isRecipeBased is true',
    type: [RecipeLineDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  recipeLines?: RecipeLineDto[];

  @ApiPropertyOptional({
    description: 'Variant definitions — required when extension.hasVariants is true',
    type: [VariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
