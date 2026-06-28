import type { Capability, EntityType, InventoryMode, PricingStrategy } from './blueprint-registry.constants';

/**
 * A single wizard step in the entity creation flow.
 * The frontend renders exactly what the blueprint defines — no hardcoded forms.
 */
export interface BlueprintCreationStep {
  id: string;
  label: string;
  fields: string[];
  /** Optional boolean expression evaluated at runtime. If false, step is skipped. */
  condition?: string;
}

/**
 * Engine configuration block per blueprint.
 * Engines that are not enabled are never invoked for this tenant.
 */
export interface BlueprintEngineConfig {
  inventory?: { enabled: boolean; mode: InventoryMode };
  pricing?: { enabled: boolean; strategy: PricingStrategy };
  tax?: { enabled: boolean };
  kitchen?: { enabled: boolean };
  booking?: { enabled: boolean };
  procurement?: { enabled: boolean };
  reporting?: { enabled: boolean };
}

/**
 * The full blueprint schema structure — stored as JSON in the DB
 * and loaded at tenant startup by the BlueprintService.
 */
export interface BlueprintSchema {
  vertical: string;
  version: number;
  displayName: string;

  /** Language overrides — the software speaks the tenant's language */
  language: {
    entity_singular: string;
    entity_plural: string;
    inventory_unit: string;
    add_entity_cta: string;
  };

  /** The primary sellable/bookable object for this business type */
  primaryEntity: EntityType;

  /** All entity types this blueprint supports */
  supportedEntityTypes: EntityType[];

  /** Which platform engines are active and how they're configured */
  engines: BlueprintEngineConfig;

  /**
   * Default capabilities per entity type.
   * Engine execution is gated on these — no vertical-specific code in engines.
   */
  capabilities: Partial<Record<EntityType, Partial<Record<Capability, boolean>>>>;

  /** Guided multi-step creation flow per entity type */
  creationWorkflow?: Partial<Record<
    EntityType,
    {
      mode: 'WIZARD' | 'QUICK_ADD';
      steps: BlueprintCreationStep[];
    }
  >>;

  /** Fields that must be present before entity can transition from DRAFT */
  requiredFields?: Partial<Record<EntityType, string[]>>;

  /** Navigation items rendered by the frontend shell */
  navigation?: {
    primary: string[];
    settings: string[];
  };

  /** Bulk import configuration */
  bulkImport?: {
    enabled: boolean;
    template: string;
    validationProfile: 'STRICT' | 'STANDARD' | 'LENIENT';
  };

  /** Superadmin overrides that can restrict or extend blueprint defaults */
  overrides?: {
    allowedEntityTypes?: EntityType[];
    variantPolicy?: 'NONE' | 'SIMPLE' | 'FULL_MATRIX';
    inventoryPolicy?: InventoryMode;
    pricingPolicy?: PricingStrategy;
    workflowPolicy?: 'WIZARD' | 'QUICK_ADD';
    bulkImportEnabled?: boolean;
    validationProfile?: 'STRICT' | 'STANDARD' | 'LENIENT';
  };
}
