import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EntityService } from './entity.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import type { EntityType } from '../blueprints/blueprint-registry.constants';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

type JwtPayload = {
  sub: string;
  tenantId: string;
  email?: string;
  role?: string;
};

/**
 * Entity Controller — single router for all business entities across all verticals.
 *
 * The tenantId is resolved from the authenticated user's JWT payload.
 * The blueprint for that tenant determines which entity types are valid,
 * which fields are required, and what creation workflow to use.
 *
 * Endpoints are vertical-agnostic — no separate /menu-items, /products, /services routes.
 * The frontend uses the entityType query param to filter.
 */
@ApiTags('Platform — Entities')
@ApiBearerAuth()
@Controller('platform/entities')
export class EntityController {
  constructor(private readonly entityService: EntityService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a business entity',
    description:
      'Creates a Menu Item, Product, Service, or any entity type defined by the tenant blueprint. ' +
      'Blueprint-level validation runs automatically — required fields and type availability are enforced.',
  })
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEntityDto) {
    return this.entityService.create(user.tenantId, user.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List all entities for this tenant',
    description: 'Returns all non-deleted entities. Use ?entityType=MENU_ITEM to filter by type.',
  })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('entityType') entityType?: string,
    @Query('status') status?: string,
  ) {
    return this.entityService.findAll(user.tenantId, entityType, status);
  }

  @Get('workflow/:entityType')
  @ApiOperation({
    summary: 'Get creation workflow for an entity type',
    description:
      'Returns the wizard step definition for the given entity type. ' +
      'The frontend renders exactly what this returns — no hardcoded forms.',
  })
  getWorkflow(@CurrentUser() user: JwtPayload, @Param('entityType') entityType: string) {
    return this.entityService.getCreationWorkflow(user.tenantId, entityType as EntityType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get entity by ID with resolved capabilities' })
  findById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entityService.findById(user.tenantId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an entity' })
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEntityDto,
  ) {
    return this.entityService.update(user.tenantId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete an entity' })
  @HttpCode(HttpStatus.OK)
  softDelete(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.entityService.softDelete(user.tenantId, id);
  }
}
