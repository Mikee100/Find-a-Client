/**
 * Canonical capability keys.
 * Engines subscribe to capabilities — not entity types.
 * Every engine checks these flags before executing vertical-specific logic.
 */
export const CAPABILITY = {
  CAN_TRACK_INVENTORY: 'CAN_TRACK_INVENTORY',
  CAN_CONSUME_INGREDIENTS: 'CAN_CONSUME_INGREDIENTS',
  CAN_HAVE_VARIANTS: 'CAN_HAVE_VARIANTS',
  CAN_REQUIRE_BOOKING: 'CAN_REQUIRE_BOOKING',
  CAN_REQUIRE_STAFF: 'CAN_REQUIRE_STAFF',
  CAN_GENERATE_KITCHEN_TICKET: 'CAN_GENERATE_KITCHEN_TICKET',
  CAN_GENERATE_WORK_ORDER: 'CAN_GENERATE_WORK_ORDER',
  CAN_BE_DELIVERED: 'CAN_BE_DELIVERED',
  CAN_BE_RESERVED: 'CAN_BE_RESERVED',
  CAN_HAVE_MODIFIERS: 'CAN_HAVE_MODIFIERS',
  CAN_HAVE_COMBOS: 'CAN_HAVE_COMBOS',
  CAN_EXPIRE: 'CAN_EXPIRE',
  CAN_BE_RETURNED: 'CAN_BE_RETURNED',
  CAN_HAVE_SERIAL: 'CAN_HAVE_SERIAL',
  CAN_EARN_LOYALTY: 'CAN_EARN_LOYALTY',
  CAN_USE_DISCOUNT: 'CAN_USE_DISCOUNT',
} as const;

export type Capability = (typeof CAPABILITY)[keyof typeof CAPABILITY];

/**
 * Supported vertical identifiers.
 * Each maps to a blueprint definition in the registry.
 */
export const VERTICAL = {
  RESTAURANT: 'RESTAURANT',
  FASHION: 'FASHION',
  SPA: 'SPA',
  MECHANIC: 'MECHANIC',
  PHARMACY: 'PHARMACY',
  DENTAL_CLINIC: 'DENTAL_CLINIC',
} as const;

export type Vertical = (typeof VERTICAL)[keyof typeof VERTICAL];

/**
 * Pricing strategy identifiers per blueprint.
 * Each strategy is a registered implementation of IPricingEngine.
 */
export const PRICING_STRATEGY = {
  STANDARD: 'STANDARD',
  TIME_WINDOW: 'TIME_WINDOW',
  MARKDOWN_RULES: 'MARKDOWN_RULES',
  STAFF_TIER: 'STAFF_TIER',
  OCCUPANCY: 'OCCUPANCY',
  CHANNEL: 'CHANNEL',
} as const;

export type PricingStrategy = (typeof PRICING_STRATEGY)[keyof typeof PRICING_STRATEGY];

/**
 * Inventory mode identifiers per blueprint.
 */
export const INVENTORY_MODE = {
  SKU_BASED: 'SKU_BASED',
  RECIPE_BASED: 'RECIPE_BASED',
  CONSUMABLE_ESTIMATE: 'CONSUMABLE_ESTIMATE',
  MIXED: 'MIXED',
  NONE: 'NONE',
} as const;

export type InventoryMode = (typeof INVENTORY_MODE)[keyof typeof INVENTORY_MODE];

/**
 * Entity type identifiers.
 * The primary entity per blueprint defines the language the tenant works in.
 */
export const ENTITY_TYPE = {
  // Restaurant
  MENU_ITEM: 'MENU_ITEM',
  INGREDIENT: 'INGREDIENT',
  MODIFIER: 'MODIFIER',
  COMBO: 'COMBO',
  // Fashion
  PRODUCT: 'PRODUCT',
  BUNDLE: 'BUNDLE',
  // Spa / Salon
  SERVICE: 'SERVICE',
  // Mechanic
  JOB_TYPE: 'JOB_TYPE',
  // Pharmacy
  MEDICINE: 'MEDICINE',
  // Dental
  TREATMENT: 'TREATMENT',
} as const;

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

/**
 * Validation profile strictness per blueprint.
 */
export const VALIDATION_PROFILE = {
  STRICT: 'STRICT',
  STANDARD: 'STANDARD',
  LENIENT: 'LENIENT',
} as const;
