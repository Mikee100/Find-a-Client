import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/common/cache/cache.service';
import { BlueprintService } from '../blueprints/blueprint.service';
import type { EntityType } from '../blueprints/blueprint-registry.constants';
import type { CreateEntityDto } from './dto/create-entity.dto';
import type { UpdateEntityDto } from './dto/update-entity.dto';

/**
 * Entity Service — CRUD for all business entities across all verticals.
 *
 * This service is vertical-agnostic. Business rules (which fields are required,
 * which capabilities apply, which workflow to use) are resolved from the
 * tenant's blueprint via BlueprintService.
 *
 * No vertical-specific code lives here.
 */
@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly blueprintService: BlueprintService,
  ) {}

  /**
   * Creates a new entity, validating against the blueprint's required fields
   * and writing the extension payload.
   */
  async create(tenantId: string, operatorId: string, dto: CreateEntityDto) {
    // 1. Validate entity type is allowed by this blueprint
    const blueprint = await this.blueprintService.getForTenant(tenantId);
    if (!blueprint.supportedEntityTypes.includes(dto.entityType as EntityType)) {
      throw new BadRequestException(
        `Entity type '${dto.entityType}' is not supported by this tenant's blueprint (${blueprint.vertical}).`,
      );
    }

    // 2. Validate required fields from blueprint
    const requiredFields = blueprint.requiredFields?.[dto.entityType as EntityType] ?? [];
    for (const field of requiredFields) {
      const value = (dto as Record<string, unknown>)[field];
      if (value === undefined || value === null || value === '') {
        throw new BadRequestException(this.buildValidationMessage(field, dto.entityType, blueprint.vertical));
      }
    }

    // 3. Create entity + extension in a transaction
    const entity = await this.prisma.$transaction(async (tx) => {
      const created = await tx.entity.create({
        data: {
          tenantId,
          entityType: dto.entityType,
          name: dto.name,
          status: 'DRAFT',
          taxClass: dto.taxClass,
          basePrice: dto.basePrice,
          currency: dto.currency ?? 'USD',
          branchScope: dto.branchScope ?? [],
          tags: dto.tags ?? [],
          createdBy: operatorId,
        },
      });

      // Write the extension record
      await tx.entityExtension.create({
        data: {
          entityId: created.id,
          blueprintId: blueprint.vertical, // resolved to DB id in production
          trackInventory: dto.extension?.trackInventory ?? false,
          stockUnit: dto.extension?.stockUnit ?? null,
          reorderPoint: dto.extension?.reorderPoint ?? null,
          reorderQty: dto.extension?.reorderQty ?? null,
          hasVariants: dto.extension?.hasVariants ?? false,
          requiresBooking: dto.extension?.requiresBooking ?? false,
          durationMinutes: dto.extension?.durationMinutes ?? null,
          requiresStaff: dto.extension?.requiresStaff ?? false,
          generatesKitchenTicket: dto.extension?.generatesKitchenTicket ?? false,
          prepStation: dto.extension?.prepStation ?? null,
          isRecipeBased: dto.extension?.isRecipeBased ?? false,
          payload: (dto.extension?.payload ?? {}) as object,
        },
      });

      // Write recipe lines if recipe-based
      if (dto.recipeLines?.length) {
        await tx.recipeLine.createMany({
          data: dto.recipeLines.map((line) => ({
            entityId: created.id,
            ingredientId: line.ingredientId,
            quantity: line.quantity,
            unit: line.unit,
            wasteFactor: line.wasteFactor ?? 0,
            notes: line.notes ?? null,
          })),
        });
      }

      // Write variants if applicable
      if (dto.variants?.length) {
        await tx.entityVariant.createMany({
          data: dto.variants.map((v) => ({
            entityId: created.id,
            tenantId,
            sku: v.sku,
            barcode: v.barcode ?? null,
            attributes: v.attributes as object,
            priceOverride: v.priceOverride ?? null,
            costPrice: v.costPrice ?? null,
          })),
        });
      }

      return created;
    });

    // 4. Resolve and return capability map for response
    const capabilities = await this.blueprintService.getCapabilityMap(
      tenantId,
      dto.entityType as EntityType,
    );

    await this.invalidateEntityCaches(tenantId);

    this.logger.log(`Entity created: ${entity.id} (${dto.entityType}) for tenant ${tenantId}`);
    return { ...entity, capabilities };
  }

  async findAll(tenantId: string, entityType?: string, status?: string) {
    const cacheKey = `entities:${tenantId}:${entityType ?? 'all'}:${status ?? 'all'}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const entities = await this.prisma.entity.findMany({
      where: {
        tenantId,
        deletedAt: null,
        ...(entityType ? { entityType } : {}),
        ...(status ? { status } : {}),
      },
      include: { extension: true, variants: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    await this.cache.set(cacheKey, entities, 60);
    return entities;
  }

  async findById(tenantId: string, entityId: string) {
    const entity = await this.prisma.entity.findFirst({
      where: { id: entityId, tenantId, deletedAt: null },
      include: {
        extension: true,
        variants: true,
        recipeLines: { include: { ingredient: true } },
        capabilityFlags: true,
      },
    });

    if (!entity) throw new NotFoundException(`Entity ${entityId} not found.`);

    const capabilities = await this.blueprintService.getCapabilityMap(
      tenantId,
      entity.entityType as EntityType,
    );

    return { ...entity, capabilities };
  }

  async update(tenantId: string, entityId: string, dto: UpdateEntityDto) {
    const existing = await this.prisma.entity.findFirst({
      where: { id: entityId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Entity ${entityId} not found.`);

    const updated = await this.prisma.$transaction(async (tx) => {
      const entity = await tx.entity.update({
        where: { id: entityId },
        data: {
          name: dto.name,
          status: dto.status,
          taxClass: dto.taxClass,
          basePrice: dto.basePrice,
          currency: dto.currency,
          branchScope: dto.branchScope,
          tags: dto.tags,
          sortOrder: dto.sortOrder,
          updatedAt: new Date(),
        },
      });

      if (dto.extension) {
        await tx.entityExtension.update({
          where: { entityId },
          data: {
            trackInventory: dto.extension.trackInventory,
            reorderPoint: dto.extension.reorderPoint,
            reorderQty: dto.extension.reorderQty,
            requiresBooking: dto.extension.requiresBooking,
            durationMinutes: dto.extension.durationMinutes,
            generatesKitchenTicket: dto.extension.generatesKitchenTicket,
            prepStation: dto.extension.prepStation,
            payload: dto.extension.payload as object,
          },
        });
      }

      return entity;
    });

    await this.invalidateEntityCaches(tenantId);
    return updated;
  }

  async softDelete(tenantId: string, entityId: string): Promise<{ deleted: true }> {
    const existing = await this.prisma.entity.findFirst({
      where: { id: entityId, tenantId, deletedAt: null },
    });
    if (!existing) throw new NotFoundException(`Entity ${entityId} not found.`);

    await this.prisma.entity.update({
      where: { id: entityId },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });

    await this.invalidateEntityCaches(tenantId);
    return { deleted: true };
  }

  /**
   * Returns the creation wizard definition for a given entity type.
   * Frontend renders exactly what this returns — no hardcoded forms.
   */
  async getCreationWorkflow(tenantId: string, entityType: EntityType) {
    return this.blueprintService.getCreationWorkflow(tenantId, entityType);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async invalidateEntityCaches(tenantId: string) {
    await this.cache.invalidateNamespace(`entities:${tenantId}`);
  }

  /**
   * Maps field names to business-language validation messages.
   * Messages are tenant-vertical-aware — users see their own terminology.
   */
  private buildValidationMessage(field: string, entityType: string, vertical: string): string {
    const messages: Record<string, Record<string, string>> = {
      RESTAURANT: {
        name: 'Every menu item needs a name before it can be saved.',
        base_price: 'Please enter a selling price before continuing.',
        tax_class: 'A tax class is required — check your tax settings.',
        category: 'Please assign this menu item to a category.',
      },
      FASHION: {
        name: 'Every product needs a name before it can be saved.',
        base_price: 'Please enter a selling price before continuing.',
        cost_price: 'Cost price is required to calculate your margin correctly.',
        tax_class: 'A tax class is required — check your tax settings.',
        category: 'Please assign this product to a category.',
      },
      SPA: {
        name: 'Every service needs a name before it can be saved.',
        base_price: 'Please enter a price for this service.',
        duration_minutes: 'Bookable services must have a set duration so your calendar works correctly.',
        tax_class: 'A tax class is required — check your tax settings.',
      },
    };

    return (
      messages[vertical]?.[field] ??
      `'${field}' is required for ${entityType.toLowerCase().replace('_', ' ')} records.`
    );
  }
}
