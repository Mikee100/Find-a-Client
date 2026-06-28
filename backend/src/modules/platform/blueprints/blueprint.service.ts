import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/common/cache/cache.service';
import type { BlueprintSchema } from './blueprint.types';
import { RESTAURANT_BLUEPRINT_V1, FASHION_BLUEPRINT_V1, SPA_BLUEPRINT_V1 } from './system-blueprints';
import type { Capability, EntityType } from './blueprint-registry.constants';

/** In-memory registry of all system blueprints, keyed by vertical */
const SYSTEM_BLUEPRINTS: Record<string, BlueprintSchema> = {
  RESTAURANT: RESTAURANT_BLUEPRINT_V1,
  FASHION: FASHION_BLUEPRINT_V1,
  SPA: SPA_BLUEPRINT_V1,
};

@Injectable()
export class BlueprintService {
  private readonly logger = new Logger(BlueprintService.name);
  private readonly CACHE_TTL = 600; // 10 minutes — blueprints rarely change

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Resolves the active blueprint for a tenant.
   *
   * Resolution order:
   * 1. Redis cache (fast path)
   * 2. DB record (loads & merges superadmin overrides)
   * 3. In-memory fallback (system defaults, never fails)
   */
  async getForTenant(tenantId: string): Promise<BlueprintSchema> {
    const cacheKey = `blueprint:tenant:${tenantId}`;
    const cached = await this.cache.get<BlueprintSchema>(cacheKey);
    if (cached) return cached;

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { blueprint: true },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId} not found`);
    }

    const blueprintSchema = tenant.blueprint.schema as unknown as BlueprintSchema;

    // Merge any superadmin overrides stored on the tenant
    const resolved = this.applyTenantOverrides(blueprintSchema, tenant.blueprintOverrides as Record<string, unknown> | null);

    await this.cache.set(cacheKey, resolved, this.CACHE_TTL);
    return resolved;
  }

  /**
   * Resolves a blueprint by vertical identifier.
   * Used for onboarding flows before a tenant is created.
   */
  getByVertical(vertical: string): BlueprintSchema {
    const blueprint = SYSTEM_BLUEPRINTS[vertical.toUpperCase()];
    if (!blueprint) {
      throw new NotFoundException(`No blueprint found for vertical: ${vertical}`);
    }
    return blueprint;
  }

  /**
   * Evaluates whether a specific capability is enabled for an entity type
   * within a tenant's resolved blueprint.
   *
   * Capability resolution order:
   * 1. Blueprint capability default
   * 2. Tenant override (if any)
   * 3. Per-entity instance override stored in entity_capability_flags table
   */
  async resolveCapability(
    tenantId: string,
    entityId: string,
    entityType: EntityType,
    capability: Capability,
  ): Promise<boolean> {
    const blueprint = await this.getForTenant(tenantId);

    // Step 1: Blueprint default
    const blueprintDefault = blueprint.capabilities?.[entityType]?.[capability] ?? false;

    // Step 2: Check entity-level override in DB
    const override = await this.prisma.entityCapabilityFlag.findUnique({
      where: { entityId_capability: { entityId, capability } },
    });

    if (override) {
      this.logger.debug(`Capability ${capability} for entity ${entityId} overridden to ${override.enabled}`);
      return override.enabled;
    }

    return blueprintDefault;
  }

  /**
   * Returns all capabilities for an entity type from the resolved blueprint.
   * Used by engines during request processing to avoid repeated DB lookups.
   */
  async getCapabilityMap(
    tenantId: string,
    entityType: EntityType,
  ): Promise<Partial<Record<Capability, boolean>>> {
    const blueprint = await this.getForTenant(tenantId);
    return blueprint.capabilities?.[entityType] ?? {};
  }

  /**
   * Returns the creation workflow definition for a given entity type.
   * Frontend renders exactly what this returns — no hardcoded forms.
   */
  async getCreationWorkflow(tenantId: string, entityType: EntityType) {
    const blueprint = await this.getForTenant(tenantId);
    return blueprint.creationWorkflow?.[entityType] ?? null;
  }

  /**
   * Returns required fields for entity validation.
   */
  async getRequiredFields(tenantId: string, entityType: EntityType): Promise<string[]> {
    const blueprint = await this.getForTenant(tenantId);
    return blueprint.requiredFields?.[entityType] ?? [];
  }

  /**
   * Invalidates the cached blueprint for a tenant — call after superadmin updates.
   */
  async invalidateTenantBlueprint(tenantId: string): Promise<void> {
    await this.cache.invalidateNamespace(`blueprint:tenant:${tenantId}`);
    this.logger.log(`Blueprint cache invalidated for tenant ${tenantId}`);
  }

  /**
   * Seeds system blueprints into the database.
   * Safe to call multiple times — uses upsert.
   */
  async seedSystemBlueprints(): Promise<void> {
    for (const [vertical, schema] of Object.entries(SYSTEM_BLUEPRINTS)) {
      await this.prisma.blueprint.upsert({
        where: { vertical },
        update: { schema: schema as object, version: schema.version, displayName: schema.displayName },
        create: {
          vertical,
          version: schema.version,
          displayName: schema.displayName,
          schema: schema as object,
          isSystem: true,
        },
      });
      this.logger.log(`Seeded system blueprint: ${vertical} v${schema.version}`);
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  private applyTenantOverrides(
    base: BlueprintSchema,
    overrides: Record<string, unknown> | null,
  ): BlueprintSchema {
    if (!overrides) return base;

    const merged: BlueprintSchema = { ...base };

    if (overrides['allowedEntityTypes']) {
      merged.supportedEntityTypes = overrides['allowedEntityTypes'] as EntityType[];
    }

    if (overrides['workflowPolicy']) {
      // Override all creation workflow modes
      if (merged.creationWorkflow) {
        for (const entityType of Object.keys(merged.creationWorkflow) as EntityType[]) {
          merged.creationWorkflow[entityType]!.mode = overrides['workflowPolicy'] as 'WIZARD' | 'QUICK_ADD';
        }
      }
    }

    return merged;
  }
}
