import type { BlueprintSchema } from './blueprint.types';
import { CAPABILITY, ENTITY_TYPE } from './blueprint-registry.constants';

/**
 * Restaurant Blueprint — v1
 *
 * Primary entity: Menu Item
 * Language: "Add Menu Item", "Menu Items", "Portion"
 * Inventory: Recipe-based ingredient deduction
 * Pricing: Time-window (happy hour, day-of-week)
 * Kitchen: Yes — generates kitchen print tickets
 * Booking: No
 */
export const RESTAURANT_BLUEPRINT_V1: BlueprintSchema = {
  vertical: 'RESTAURANT',
  version: 1,
  displayName: 'Restaurant',
  language: {
    entity_singular: 'Menu Item',
    entity_plural: 'Menu Items',
    inventory_unit: 'Portion',
    add_entity_cta: 'Add Menu Item',
  },
  primaryEntity: ENTITY_TYPE.MENU_ITEM,
  supportedEntityTypes: [
    ENTITY_TYPE.MENU_ITEM,
    ENTITY_TYPE.INGREDIENT,
    ENTITY_TYPE.MODIFIER,
    ENTITY_TYPE.COMBO,
  ],
  engines: {
    inventory: { enabled: true, mode: 'RECIPE_BASED' },
    pricing: { enabled: true, strategy: 'TIME_WINDOW' },
    tax: { enabled: true },
    kitchen: { enabled: true },
    booking: { enabled: false },
    procurement: { enabled: true },
    reporting: { enabled: true },
  },
  capabilities: {
    [ENTITY_TYPE.MENU_ITEM]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: false,
      [CAPABILITY.CAN_CONSUME_INGREDIENTS]: true,
      [CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]: true,
      [CAPABILITY.CAN_HAVE_VARIANTS]: false,
      [CAPABILITY.CAN_REQUIRE_BOOKING]: false,
      [CAPABILITY.CAN_REQUIRE_STAFF]: false,
      [CAPABILITY.CAN_BE_DELIVERED]: true,
      [CAPABILITY.CAN_BE_RESERVED]: false,
      [CAPABILITY.CAN_GENERATE_WORK_ORDER]: false,
      [CAPABILITY.CAN_HAVE_MODIFIERS]: true,
      [CAPABILITY.CAN_HAVE_COMBOS]: true,
      [CAPABILITY.CAN_EARN_LOYALTY]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
    [ENTITY_TYPE.INGREDIENT]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: true,
      [CAPABILITY.CAN_CONSUME_INGREDIENTS]: false,
      [CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]: false,
      [CAPABILITY.CAN_HAVE_VARIANTS]: false,
      [CAPABILITY.CAN_EXPIRE]: true,
      [CAPABILITY.CAN_HAVE_SERIAL]: false,
    },
    [ENTITY_TYPE.MODIFIER]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: false,
      [CAPABILITY.CAN_USE_DISCOUNT]: false,
    },
    [ENTITY_TYPE.COMBO]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: false,
      [CAPABILITY.CAN_HAVE_COMBOS]: true,
      [CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
  },
  creationWorkflow: {
    [ENTITY_TYPE.MENU_ITEM]: {
      mode: 'WIZARD',
      steps: [
        {
          id: 'identity',
          label: 'Menu Item Details',
          fields: ['name', 'category', 'description', 'allergens', 'image'],
        },
        {
          id: 'pricing',
          label: 'Pricing & Tax',
          fields: ['base_price', 'dine_in_price', 'takeaway_price', 'delivery_price', 'tax_class'],
        },
        {
          id: 'recipe',
          label: 'Recipe & Ingredients',
          fields: ['recipe_lines', 'is_recipe_based', 'waste_factor_pct'],
        },
        {
          id: 'availability',
          label: 'Availability',
          fields: ['branch_scope', 'availability_windows', 'prep_station', 'status'],
        },
      ],
    },
    [ENTITY_TYPE.INGREDIENT]: {
      mode: 'QUICK_ADD',
      steps: [
        {
          id: 'identity',
          label: 'Ingredient Details',
          fields: ['name', 'unit', 'reorder_point', 'reorder_qty', 'cost_price', 'supplier_id'],
        },
      ],
    },
    [ENTITY_TYPE.MODIFIER]: {
      mode: 'QUICK_ADD',
      steps: [
        {
          id: 'identity',
          label: 'Modifier Details',
          fields: ['name', 'options', 'is_required', 'max_selections'],
        },
      ],
    },
    [ENTITY_TYPE.COMBO]: {
      mode: 'WIZARD',
      steps: [
        { id: 'identity', label: 'Combo Details', fields: ['name', 'description', 'image'] },
        { id: 'items', label: 'Combo Items', fields: ['combo_lines'] },
        { id: 'pricing', label: 'Pricing', fields: ['base_price', 'tax_class'] },
      ],
    },
  },
  requiredFields: {
    [ENTITY_TYPE.MENU_ITEM]: ['name', 'base_price', 'tax_class', 'category'],
    [ENTITY_TYPE.INGREDIENT]: ['name', 'unit', 'cost_price'],
    [ENTITY_TYPE.MODIFIER]: ['name'],
    [ENTITY_TYPE.COMBO]: ['name', 'base_price', 'tax_class'],
  },
  navigation: {
    primary: ['Menu', 'Kitchen', 'Tables', 'Orders', 'Reports'],
    settings: ['Modifiers', 'Printers', 'Branches', 'Staff'],
  },
  bulkImport: {
    enabled: true,
    template: 'restaurant_menu_import_v1.xlsx',
    validationProfile: 'STRICT',
  },
};

/**
 * Fashion Blueprint — v1
 *
 * Primary entity: Product (Style + Variants)
 * Language: "Add Product", "Products", "Unit"
 * Inventory: SKU-based per variant, with reorder logic
 * Pricing: Markdown rules (age-based)
 * Kitchen: No
 * Booking: No
 */
export const FASHION_BLUEPRINT_V1: BlueprintSchema = {
  vertical: 'FASHION',
  version: 1,
  displayName: 'Fashion & Apparel',
  language: {
    entity_singular: 'Product',
    entity_plural: 'Products',
    inventory_unit: 'Unit',
    add_entity_cta: 'Add Product',
  },
  primaryEntity: ENTITY_TYPE.PRODUCT,
  supportedEntityTypes: [ENTITY_TYPE.PRODUCT, ENTITY_TYPE.BUNDLE],
  engines: {
    inventory: { enabled: true, mode: 'SKU_BASED' },
    pricing: { enabled: true, strategy: 'MARKDOWN_RULES' },
    tax: { enabled: true },
    kitchen: { enabled: false },
    booking: { enabled: false },
    procurement: { enabled: true },
    reporting: { enabled: true },
  },
  capabilities: {
    [ENTITY_TYPE.PRODUCT]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: true,
      [CAPABILITY.CAN_CONSUME_INGREDIENTS]: false,
      [CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]: false,
      [CAPABILITY.CAN_HAVE_VARIANTS]: true,
      [CAPABILITY.CAN_REQUIRE_BOOKING]: false,
      [CAPABILITY.CAN_REQUIRE_STAFF]: false,
      [CAPABILITY.CAN_BE_DELIVERED]: true,
      [CAPABILITY.CAN_BE_RESERVED]: false,
      [CAPABILITY.CAN_GENERATE_WORK_ORDER]: false,
      [CAPABILITY.CAN_EXPIRE]: false,
      [CAPABILITY.CAN_BE_RETURNED]: true,
      [CAPABILITY.CAN_EARN_LOYALTY]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
    [ENTITY_TYPE.BUNDLE]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: false,
      [CAPABILITY.CAN_HAVE_COMBOS]: true,
      [CAPABILITY.CAN_BE_DELIVERED]: true,
      [CAPABILITY.CAN_BE_RETURNED]: true,
      [CAPABILITY.CAN_EARN_LOYALTY]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
  },
  creationWorkflow: {
    [ENTITY_TYPE.PRODUCT]: {
      mode: 'WIZARD',
      steps: [
        {
          id: 'style',
          label: 'Style Details',
          fields: ['name', 'brand', 'collection', 'gender', 'category', 'material', 'description', 'images'],
        },
        {
          id: 'variants',
          label: 'Variant Matrix',
          fields: ['variant_axes', 'variant_matrix'],
          condition: "capabilities.CAN_HAVE_VARIANTS === true",
        },
        {
          id: 'pricing',
          label: 'Cost & Pricing',
          fields: ['cost_price', 'base_price', 'tax_class', 'markdown_rules'],
        },
        {
          id: 'supplier',
          label: 'Supplier & Replenishment',
          fields: ['supplier_id', 'reorder_point', 'reorder_qty', 'lead_time_days'],
        },
        {
          id: 'stock',
          label: 'Opening Stock by Branch',
          fields: ['branch_stock_entries'],
        },
        {
          id: 'barcodes',
          label: 'Barcodes & Media',
          fields: ['sku', 'barcode', 'variant_images'],
        },
      ],
    },
    [ENTITY_TYPE.BUNDLE]: {
      mode: 'WIZARD',
      steps: [
        { id: 'identity', label: 'Bundle Details', fields: ['name', 'description', 'images'] },
        { id: 'items', label: 'Bundle Items', fields: ['bundle_lines'] },
        { id: 'pricing', label: 'Pricing', fields: ['base_price', 'tax_class'] },
      ],
    },
  },
  requiredFields: {
    [ENTITY_TYPE.PRODUCT]: ['name', 'base_price', 'tax_class', 'category', 'cost_price'],
    [ENTITY_TYPE.BUNDLE]: ['name', 'base_price', 'tax_class'],
  },
  navigation: {
    primary: ['Products', 'Inventory', 'Suppliers', 'Orders', 'Reports'],
    settings: ['Attributes', 'Markdown Rules', 'Branches', 'Staff'],
  },
  bulkImport: {
    enabled: true,
    template: 'fashion_product_import_v1.xlsx',
    validationProfile: 'STRICT',
  },
};

/**
 * Spa / Salon Blueprint — v1
 *
 * Primary entity: Service
 * Language: "Add Service", "Services", "Session"
 * Inventory: Consumable estimate (not full stock tracking)
 * Pricing: Staff-tier (senior therapist costs more)
 * Kitchen: No
 * Booking: Yes — required calendar appointment
 */
export const SPA_BLUEPRINT_V1: BlueprintSchema = {
  vertical: 'SPA',
  version: 1,
  displayName: 'Spa & Salon',
  language: {
    entity_singular: 'Service',
    entity_plural: 'Services',
    inventory_unit: 'Session',
    add_entity_cta: 'Add Service',
  },
  primaryEntity: ENTITY_TYPE.SERVICE,
  supportedEntityTypes: [ENTITY_TYPE.SERVICE, ENTITY_TYPE.PRODUCT],
  engines: {
    inventory: { enabled: true, mode: 'CONSUMABLE_ESTIMATE' },
    pricing: { enabled: true, strategy: 'STAFF_TIER' },
    tax: { enabled: true },
    kitchen: { enabled: false },
    booking: { enabled: true },
    procurement: { enabled: true },
    reporting: { enabled: true },
  },
  capabilities: {
    [ENTITY_TYPE.SERVICE]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: false,
      [CAPABILITY.CAN_CONSUME_INGREDIENTS]: true,
      [CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]: false,
      [CAPABILITY.CAN_HAVE_VARIANTS]: false,
      [CAPABILITY.CAN_REQUIRE_BOOKING]: true,
      [CAPABILITY.CAN_REQUIRE_STAFF]: true,
      [CAPABILITY.CAN_BE_DELIVERED]: false,
      [CAPABILITY.CAN_BE_RESERVED]: true,
      [CAPABILITY.CAN_GENERATE_WORK_ORDER]: false,
      [CAPABILITY.CAN_EARN_LOYALTY]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
    [ENTITY_TYPE.PRODUCT]: {
      [CAPABILITY.CAN_TRACK_INVENTORY]: true,
      [CAPABILITY.CAN_HAVE_VARIANTS]: false,
      [CAPABILITY.CAN_BE_RETURNED]: true,
      [CAPABILITY.CAN_EARN_LOYALTY]: true,
      [CAPABILITY.CAN_USE_DISCOUNT]: true,
    },
  },
  creationWorkflow: {
    [ENTITY_TYPE.SERVICE]: {
      mode: 'WIZARD',
      steps: [
        {
          id: 'identity',
          label: 'Service Details',
          fields: ['name', 'category', 'description', 'image'],
        },
        {
          id: 'scheduling',
          label: 'Scheduling',
          fields: ['duration_minutes', 'requires_staff', 'staff_skill_level', 'buffer_minutes'],
        },
        {
          id: 'pricing',
          label: 'Pricing & Tax',
          fields: ['base_price', 'tax_class', 'staff_tier_pricing'],
        },
        {
          id: 'consumables',
          label: 'Consumables Used',
          fields: ['recipe_lines'],
        },
      ],
    },
    [ENTITY_TYPE.PRODUCT]: {
      mode: 'QUICK_ADD',
      steps: [
        {
          id: 'identity',
          label: 'Product Details',
          fields: ['name', 'category', 'base_price', 'cost_price', 'tax_class', 'reorder_point'],
        },
      ],
    },
  },
  requiredFields: {
    [ENTITY_TYPE.SERVICE]: ['name', 'base_price', 'duration_minutes', 'tax_class'],
    [ENTITY_TYPE.PRODUCT]: ['name', 'base_price', 'tax_class'],
  },
  navigation: {
    primary: ['Services', 'Appointments', 'Clients', 'Products', 'Reports'],
    settings: ['Staff', 'Rooms', 'Availability', 'Branches'],
  },
};
