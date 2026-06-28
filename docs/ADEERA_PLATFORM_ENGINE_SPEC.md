# Adeera Platform Engine Specification

> **Version**: 1.0  
> **Status**: Draft — Pending Engineering Review  
> **Scope**: Canonical data model, engine interface contracts, blueprint schema, and per-vertical examples

---

## 1. Core Philosophy

Adeera is a **capability-composable Business Operating System**.

- **Blueprints** define business domain language, primary entities, and active capabilities per tenant.
- **Engines** provide shared platform infrastructure (pricing, inventory, tax, bookings, etc.).
- **Vertical logic is configuration — not code.**

The test of correctness: onboarding a new vertical (e.g., dental clinic) should require writing a blueprint file — not new engine code.

---

## 2. Canonical Data Model

### 2.1 Tenant

The root isolation boundary. Every object in the system belongs to a Tenant.

```sql
CREATE TABLE tenants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           VARCHAR(255) NOT NULL,
  slug           VARCHAR(100) UNIQUE NOT NULL,        -- URL-safe handle
  blueprint_id   UUID NOT NULL REFERENCES blueprints(id),
  blueprint_ver  INTEGER NOT NULL DEFAULT 1,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE | SUSPENDED | TRIAL
  timezone       VARCHAR(60) NOT NULL DEFAULT 'UTC',
  currency       CHAR(3) NOT NULL DEFAULT 'USD',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 2.2 Entity (Universal Business Object)

All sellable/bookable/trackable objects across all verticals map to this single table.
The `entity_type` column distinguishes the domain object in each blueprint.

```sql
CREATE TABLE entities (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type    VARCHAR(60) NOT NULL,   -- 'MENU_ITEM' | 'PRODUCT' | 'SERVICE' | 'JOB_TYPE' | etc.
  name           VARCHAR(255) NOT NULL,
  status         VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT | ACTIVE | ARCHIVED
  tax_class      VARCHAR(60),            -- references tax engine config
  base_price     NUMERIC(14, 4),
  currency       CHAR(3),
  branch_scope   UUID[],                -- NULL = all branches; array = specific branches
  tags           TEXT[],
  sort_order     INTEGER DEFAULT 0,
  created_by     UUID NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,           -- soft delete

  CONSTRAINT fk_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_entity_tenant_type ON entities(tenant_id, entity_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_entity_status      ON entities(tenant_id, status)      WHERE deleted_at IS NULL;
CREATE INDEX idx_entity_tags        ON entities USING GIN(tags);
```

**Design rule**: The Pricing Engine, Tax Engine, and Reporting Engine always operate on `entities`. They never need to know the `entity_type`.

---

### 2.3 EntityExtension (Vertical-Specific Payload)

Typed columns cover fields shared by 2+ verticals. The `payload` JSON column absorbs
genuinely vertical-specific attributes. Fields promoted from payload to typed columns
do not break existing tenants.

```sql
CREATE TABLE entity_extensions (
  entity_id      UUID PRIMARY KEY REFERENCES entities(id) ON DELETE CASCADE,
  blueprint_id   UUID NOT NULL REFERENCES blueprints(id),

  -- ── Inventory Engine fields (promoted: used by restaurant + fashion + pharmacy) ──
  track_inventory    BOOLEAN NOT NULL DEFAULT FALSE,
  stock_unit         VARCHAR(30),              -- 'kg' | 'unit' | 'ml' | 'piece'
  reorder_point      NUMERIC(10, 3),
  reorder_qty        NUMERIC(10, 3),

  -- ── Variant Engine fields (promoted: used by fashion + pharmacy) ──
  has_variants       BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Booking Engine fields (promoted: used by spa + hotel + clinic) ──
  requires_booking   BOOLEAN NOT NULL DEFAULT FALSE,
  duration_minutes   INTEGER,
  requires_staff     BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Kitchen Engine fields (promoted: restaurant) ──
  generates_kitchen_ticket BOOLEAN NOT NULL DEFAULT FALSE,
  prep_station       VARCHAR(60),

  -- ── Recipe/BOM Engine fields (promoted: restaurant + manufacturing) ──
  is_recipe_based    BOOLEAN NOT NULL DEFAULT FALSE,

  -- ── Open extension payload ──
  payload            JSONB NOT NULL DEFAULT '{}',

  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ext_blueprint ON entity_extensions(blueprint_id);
CREATE INDEX idx_ext_payload   ON entity_extensions USING GIN(payload);
```

---

### 2.4 CapabilityFlags (Per Entity Instance)

Capabilities are evaluated at runtime per entity instance.
This allows one tenant to have mixed entities — e.g., a spa selling both services and retail products.

```sql
CREATE TABLE entity_capability_flags (
  entity_id             UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  capability            VARCHAR(80) NOT NULL,   -- see §4 for full registry
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  source                VARCHAR(20) NOT NULL DEFAULT 'BLUEPRINT', -- BLUEPRINT | OVERRIDE
  PRIMARY KEY (entity_id, capability)
);
```

**Capability evaluation order**:
1. Blueprint default (all entities of this type get this capability)
2. EntityExtension typed field (structural override)
3. CapabilityFlag OVERRIDE record (operator-level entity exception)

---

### 2.5 EntityVariant (Fashion / Pharmacy / Hardware)

```sql
CREATE TABLE entity_variants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id      UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES tenants(id),
  sku            VARCHAR(100) UNIQUE,
  barcode        VARCHAR(100),
  attributes     JSONB NOT NULL DEFAULT '{}',  -- {"size": "L", "color": "Navy"}
  price_override NUMERIC(14, 4),
  cost_price     NUMERIC(14, 4),
  weight_grams   INTEGER,
  status         VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_variant_entity  ON entity_variants(entity_id);
CREATE INDEX idx_variant_sku     ON entity_variants(sku);
CREATE INDEX idx_variant_attrs   ON entity_variants USING GIN(attributes);
```

---

### 2.6 RecipeLine (Restaurant / Manufacturing BOM)

```sql
CREATE TABLE recipe_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id        UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE, -- the menu item
  ingredient_id    UUID NOT NULL REFERENCES entities(id),                   -- the ingredient entity
  quantity         NUMERIC(10, 4) NOT NULL,
  unit             VARCHAR(30) NOT NULL,
  waste_factor_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,  -- % added for expected waste
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_entity ON recipe_lines(entity_id);
```

---

### 2.7 Blueprint

The tenant configuration contract. Defines language, entities, capabilities, and engine config.

```sql
CREATE TABLE blueprints (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical       VARCHAR(60) NOT NULL UNIQUE,   -- 'RESTAURANT' | 'FASHION' | 'SPA' | etc.
  version        INTEGER NOT NULL DEFAULT 1,
  display_name   VARCHAR(100) NOT NULL,
  schema         JSONB NOT NULL,                -- full blueprint definition (see §3)
  is_system      BOOLEAN NOT NULL DEFAULT TRUE, -- system blueprints are read-only
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

### 2.8 BlueprintMigration (Version Graph)

Enables safe blueprint upgrades without breaking live tenants.

```sql
CREATE TABLE blueprint_migrations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id    UUID NOT NULL REFERENCES blueprints(id),
  from_version    INTEGER NOT NULL,
  to_version      INTEGER NOT NULL,
  migration_notes TEXT,
  script          JSONB,       -- declarative field mapping / transform rules
  breaking_change BOOLEAN NOT NULL DEFAULT FALSE,
  released_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 3. Blueprint Schema Definition

Each blueprint is a JSON document stored in `blueprints.schema`. This is the source of truth
for what a tenant can do, what entities exist, and how the UI renders.

```jsonc
// Example: RESTAURANT blueprint v1
{
  "vertical": "RESTAURANT",
  "version": 1,
  "displayName": "Restaurant",
  "language": {
    // UI label overrides — the software speaks the customer's language
    "entity_singular": "Menu Item",
    "entity_plural":   "Menu Items",
    "inventory_unit":  "Portion",
    "add_entity_cta":  "Add Menu Item"
  },
  "primaryEntity": "MENU_ITEM",
  "supportedEntityTypes": [
    "MENU_ITEM",
    "INGREDIENT",
    "MODIFIER",
    "COMBO"
  ],
  "engines": {
    "inventory":   { "enabled": true,  "mode": "RECIPE_BASED" },
    "pricing":     { "enabled": true,  "strategy": "TIME_WINDOW" },
    "tax":         { "enabled": true  },
    "kitchen":     { "enabled": true  },
    "booking":     { "enabled": false },
    "procurement": { "enabled": true  },
    "reporting":   { "enabled": true  }
  },
  "capabilities": {
    // Defaults applied to all MENU_ITEM entities in this blueprint
    "MENU_ITEM": {
      "CAN_TRACK_INVENTORY":       false,
      "CAN_CONSUME_INGREDIENTS":   true,
      "CAN_GENERATE_KITCHEN_TICKET": true,
      "CAN_HAVE_VARIANTS":         false,
      "CAN_REQUIRE_BOOKING":       false,
      "CAN_REQUIRE_STAFF":         false,
      "CAN_BE_DELIVERED":          true,
      "CAN_BE_RESERVED":           false,
      "CAN_GENERATE_WORK_ORDER":   false
    },
    "INGREDIENT": {
      "CAN_TRACK_INVENTORY":       true,
      "CAN_CONSUME_INGREDIENTS":   false,
      "CAN_GENERATE_KITCHEN_TICKET": false,
      "CAN_HAVE_VARIANTS":         false
    }
  },
  "creationWorkflow": {
    "MENU_ITEM": {
      "mode": "WIZARD",
      "steps": [
        {
          "id":     "identity",
          "label":  "Menu Item Details",
          "fields": ["name", "category", "description", "allergens", "image"]
        },
        {
          "id":     "pricing",
          "label":  "Pricing & Tax",
          "fields": ["base_price", "dine_in_price", "takeaway_price", "tax_class"]
        },
        {
          "id":     "recipe",
          "label":  "Recipe & Ingredients",
          "fields": ["recipe_lines", "is_recipe_based", "waste_factor_pct"]
        },
        {
          "id":     "availability",
          "label":  "Availability",
          "fields": ["branch_scope", "availability_windows", "prep_station", "status"]
        }
      ]
    }
  },
  "requiredFields": {
    "MENU_ITEM": ["name", "base_price", "tax_class", "category"]
  },
  "navigation": {
    "primary": ["Menu", "Kitchen", "Tables", "Orders", "Reports"],
    "settings": ["Modifiers", "Printers", "Branches", "Staff"]
  },
  "bulkImport": {
    "enabled": true,
    "template": "restaurant_menu_import_v1.xlsx",
    "validationProfile": "STRICT"
  }
}
```

```jsonc
// Example: FASHION blueprint v1
{
  "vertical": "FASHION",
  "version": 1,
  "displayName": "Fashion & Apparel",
  "language": {
    "entity_singular": "Product",
    "entity_plural":   "Products",
    "inventory_unit":  "Unit",
    "add_entity_cta":  "Add Product"
  },
  "primaryEntity": "PRODUCT",
  "supportedEntityTypes": ["PRODUCT", "BUNDLE"],
  "engines": {
    "inventory":   { "enabled": true,  "mode": "SKU_BASED" },
    "pricing":     { "enabled": true,  "strategy": "MARKDOWN_RULES" },
    "tax":         { "enabled": true  },
    "kitchen":     { "enabled": false },
    "booking":     { "enabled": false },
    "procurement": { "enabled": true  },
    "reporting":   { "enabled": true  }
  },
  "capabilities": {
    "PRODUCT": {
      "CAN_TRACK_INVENTORY":         true,
      "CAN_CONSUME_INGREDIENTS":     false,
      "CAN_GENERATE_KITCHEN_TICKET": false,
      "CAN_HAVE_VARIANTS":           true,
      "CAN_REQUIRE_BOOKING":         false,
      "CAN_REQUIRE_STAFF":           false,
      "CAN_BE_DELIVERED":            true,
      "CAN_BE_RESERVED":             false,
      "CAN_GENERATE_WORK_ORDER":     false
    }
  },
  "creationWorkflow": {
    "PRODUCT": {
      "mode": "WIZARD",
      "steps": [
        {
          "id":     "style",
          "label":  "Style Details",
          "fields": ["name", "brand", "collection", "gender", "category", "material", "description", "images"]
        },
        {
          "id":     "variants",
          "label":  "Variant Matrix",
          "fields": ["variant_axes", "variant_matrix"],
          "condition": "capabilities.CAN_HAVE_VARIANTS === true"
        },
        {
          "id":     "pricing",
          "label":  "Cost & Pricing",
          "fields": ["cost_price", "base_price", "tax_class", "markdown_rules"]
        },
        {
          "id":     "supplier",
          "label":  "Supplier & Replenishment",
          "fields": ["supplier_id", "reorder_point", "reorder_qty", "lead_time_days"]
        },
        {
          "id":     "stock",
          "label":  "Opening Stock by Branch",
          "fields": ["branch_stock_entries"]
        },
        {
          "id":     "barcodes",
          "label":  "Barcodes & Media",
          "fields": ["sku", "barcode", "variant_images"]
        }
      ]
    }
  },
  "requiredFields": {
    "PRODUCT": ["name", "base_price", "tax_class", "category", "cost_price"]
  },
  "navigation": {
    "primary": ["Products", "Inventory", "Suppliers", "Orders", "Reports"],
    "settings": ["Attributes", "Markdown Rules", "Branches", "Staff"]
  }
}
```

```jsonc
// Example: SPA blueprint v1
{
  "vertical": "SPA",
  "version": 1,
  "displayName": "Spa & Salon",
  "language": {
    "entity_singular": "Service",
    "entity_plural":   "Services",
    "inventory_unit":  "Session",
    "add_entity_cta":  "Add Service"
  },
  "primaryEntity": "SERVICE",
  "supportedEntityTypes": ["SERVICE", "PRODUCT"],
  "engines": {
    "inventory":   { "enabled": true,  "mode": "CONSUMABLE_ESTIMATE" },
    "pricing":     { "enabled": true,  "strategy": "STAFF_TIER" },
    "tax":         { "enabled": true  },
    "booking":     { "enabled": true  },
    "kitchen":     { "enabled": false },
    "procurement": { "enabled": true  },
    "reporting":   { "enabled": true  }
  },
  "capabilities": {
    "SERVICE": {
      "CAN_TRACK_INVENTORY":         false,
      "CAN_CONSUME_INGREDIENTS":     true,
      "CAN_GENERATE_KITCHEN_TICKET": false,
      "CAN_HAVE_VARIANTS":           false,
      "CAN_REQUIRE_BOOKING":         true,
      "CAN_REQUIRE_STAFF":           true,
      "CAN_BE_DELIVERED":            false,
      "CAN_BE_RESERVED":             true,
      "CAN_GENERATE_WORK_ORDER":     false
    }
  }
}
```

---

## 4. Capability Registry

The full canonical list of capabilities the platform supports.
Engines subscribe to capabilities — not entity types.

| Capability | Description | Handled By |
|---|---|---|
| `CAN_TRACK_INVENTORY` | Entity has stock levels tracked per branch | Inventory Engine |
| `CAN_CONSUME_INGREDIENTS` | Entity deducts ingredient stock on sale | Inventory Engine |
| `CAN_HAVE_VARIANTS` | Entity can have size/color/attribute variants | Variant Engine |
| `CAN_REQUIRE_BOOKING` | Entity requires a calendar appointment | Booking Engine |
| `CAN_REQUIRE_STAFF` | Entity must be assigned to a staff member | Booking / Staff Engine |
| `CAN_GENERATE_KITCHEN_TICKET` | Sale creates a kitchen print ticket | Kitchen Engine |
| `CAN_GENERATE_WORK_ORDER` | Sale creates a workshop work order | Job Engine |
| `CAN_BE_DELIVERED` | Entity can appear on a delivery order | Delivery Engine |
| `CAN_BE_RESERVED` | Entity can be pre-reserved (tables, rooms) | Booking Engine |
| `CAN_HAVE_MODIFIERS` | Entity supports customer option add-ons | Sales Engine |
| `CAN_HAVE_COMBOS` | Entity can be bundled in combo deals | Sales Engine |
| `CAN_EXPIRE` | Entity has a shelf life / expiry date | Inventory Engine |
| `CAN_BE_RETURNED` | Entity supports return/exchange logic | Sales Engine |
| `CAN_HAVE_SERIAL` | Entity tracked by serial/lot number | Inventory Engine |
| `CAN_EARN_LOYALTY` | Purchasing earns loyalty points | CRM Engine |
| `CAN_USE_DISCOUNT` | Entity can have discount rules applied | Pricing Engine |

---

## 5. Engine Interface Contracts

Each engine exposes a typed interface. Verticals do not implement engines —
they configure them. Engine implementations live in the platform layer.

### 5.1 Pricing Engine

```typescript
interface IPricingContext {
  entityId:    string;
  tenantId:    string;
  branchId:    string;
  variantId?:  string;
  channelType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY' | 'ONLINE' | 'POS';
  timestamp:   Date;
  customerId?: string;        // for loyalty-tier pricing
}

interface IPriceResult {
  basePrice:       number;
  finalPrice:      number;
  discountApplied: number;
  discountReason?: string;    // 'HAPPY_HOUR' | 'MARKDOWN' | 'LOYALTY_TIER' | 'MANUAL'
  currency:        string;
  taxExcluded:     boolean;
}

interface IPricingEngine {
  calculatePrice(context: IPricingContext): Promise<IPriceResult>;
  previewMarkdown(entityId: string, markdownPct: number): Promise<IPriceResult>;
  getPriceRules(entityId: string): Promise<PriceRule[]>;
}
```

**Strategies registered per blueprint**:
- `STANDARD` — single price, no rules
- `TIME_WINDOW` — happy hour / day-of-week pricing (restaurant)
- `MARKDOWN_RULES` — age-based markdown (fashion)
- `STAFF_TIER` — price varies by staff skill level (spa)
- `OCCUPANCY` — dynamic demand pricing (hotel)
- `CHANNEL` — different price per sales channel

---

### 5.2 Inventory Engine

```typescript
interface IInventoryEngine {
  // Check real-time stock level for entity or variant
  getStockLevel(entityId: string, variantId?: string, branchId?: string): Promise<StockLevel>;

  // Deduct stock — called by Sales Engine on confirmed sale
  deductStock(lines: StockDeductionLine[]): Promise<StockDeductionResult>;

  // Recipe-based deduction — deducts ingredient stock from a menu item sale
  deductByRecipe(entityId: string, qty: number, branchId: string): Promise<RecipeDeductionResult>;

  // Receive stock (purchase order fulfilment)
  receiveStock(lines: StockReceiptLine[]): Promise<void>;

  // Stock adjustment (count / wastage / damage)
  adjustStock(adjustment: StockAdjustment): Promise<void>;

  // Reorder check — returns entities below reorder_point
  getReorderAlerts(tenantId: string, branchId?: string): Promise<ReorderAlert[]>;
}

interface StockDeductionLine {
  entityId:  string;
  variantId?: string;
  branchId:  string;
  quantity:  number;
  unit:      string;
  reason:    'SALE' | 'WASTE' | 'TRANSFER' | 'DAMAGE' | 'RECIPE';
}

interface StockLevel {
  entityId:   string;
  variantId?: string;
  branchId:   string;
  onHand:     number;
  reserved:   number;
  available:  number;
  unit:       string;
  belowReorder: boolean;
}
```

---

### 5.3 Tax Engine

```typescript
interface ITaxEngine {
  calculateTax(entityId: string, price: number, context: TaxContext): Promise<TaxResult>;
  getTaxClasses(tenantId: string): Promise<TaxClass[]>;
  applyTaxToCart(cart: CartLine[]): Promise<TaxedCart>;
}

interface TaxContext {
  tenantId:    string;
  branchId:    string;
  channelType: string;
  customerId?: string;      // for tax-exempt customers
}

interface TaxResult {
  taxableAmount:  number;
  taxAmount:      number;
  taxRate:        number;
  taxClassName:   string;
  inclusive:      boolean;  // is tax included in price or added on top?
}
```

---

### 5.4 Booking Engine

```typescript
interface IBookingEngine {
  // Check availability for a service on a given date
  checkAvailability(params: AvailabilityQuery): Promise<AvailabilitySlot[]>;

  // Reserve a slot (tentative hold, not confirmed)
  holdSlot(params: SlotHold): Promise<HoldResult>;

  // Confirm a booking (converts hold to confirmed appointment)
  confirmBooking(holdId: string, customerId: string): Promise<Booking>;

  // Cancel with reason
  cancelBooking(bookingId: string, reason: string): Promise<void>;

  // Get bookings for staff member on a date
  getStaffCalendar(staffId: string, date: Date): Promise<Booking[]>;
}

interface AvailabilityQuery {
  entityId:   string;     // the service
  branchId:   string;
  date:       Date;
  staffId?:   string;     // if customer wants a specific staff member
  partySize?: number;
}

interface AvailabilitySlot {
  startTime:      Date;
  endTime:        Date;
  staffId:        string;
  staffName:      string;
  available:      boolean;
}
```

---

### 5.5 Sales Engine

The orchestrator. Every sale flows through the Sales Engine, which delegates to other engines.

```typescript
interface ISalesEngine {
  // Pre-sale validation and price calculation
  buildCart(tenantId: string, branchId: string, lines: CartInputLine[]): Promise<Cart>;

  // Commit the sale — triggers all engine side-effects
  commitSale(cart: Cart, payment: PaymentInput): Promise<SaleReceipt>;

  // Void / return a sale
  voidSale(saleId: string, reason: string, lines?: ReturnLine[]): Promise<VoidResult>;
}
```

**On `commitSale`, the Sales Engine executes in order**:
1. Lock entities (optimistic concurrency)
2. Call **Tax Engine** → apply tax to all lines
3. Call **Pricing Engine** → validate prices haven't changed mid-session
4. Call **Inventory Engine** → deduct stock (SKU-based or recipe-based per capability flag)
5. If `CAN_GENERATE_KITCHEN_TICKET` → emit `KitchenTicketRequested` event
6. If `CAN_GENERATE_WORK_ORDER` → emit `WorkOrderCreated` event
7. If `CAN_EARN_LOYALTY` → emit `LoyaltyPointsEarned` event
8. Persist `Sale` record
9. Return `SaleReceipt`

---

### 5.6 Reporting Engine

```typescript
interface IReportingEngine {
  // Vertical-agnostic financial summary
  getSalesSummary(params: ReportParams): Promise<SalesSummary>;

  // Inventory health
  getInventoryReport(params: ReportParams): Promise<InventoryReport>;

  // Vertical-specific reports — resolved by blueprint
  getVerticalReport(reportId: string, params: ReportParams): Promise<VerticalReport>;
}
```

**Available vertical reports by blueprint**:

| Blueprint | Report ID | Description |
|---|---|---|
| RESTAURANT | `menu_profitability` | Revenue, COGS, margin per menu item |
| RESTAURANT | `ingredient_depletion` | Ingredient usage vs purchases |
| RESTAURANT | `wastage_analysis` | Waste recorded per ingredient |
| FASHION | `size_color_sellthrough` | Sell-through rate by variant |
| FASHION | `aging_stock` | Units by days-on-shelf bracket |
| FASHION | `supplier_performance` | Lead time, fill rate, cost variance |
| FASHION | `markdown_impact` | Revenue lost vs units moved from markdowns |
| SPA | `staff_utilisation` | Booking hours vs available hours per staff |
| SPA | `service_revenue_mix` | Revenue contribution by service type |
| ALL | `daily_sales` | Standard daily sales summary |
| ALL | `tax_liability` | Tax collected by class |

---

## 6. API Contract Examples

### 6.1 Create Entity (Restaurant — Menu Item)

**POST** `/api/v1/entities`

```jsonc
// Request
{
  "tenantId": "ten_abc123",
  "entityType": "MENU_ITEM",
  "name": "Classic Cheeseburger",
  "status": "DRAFT",
  "taxClass": "FOOD_STANDARD",
  "basePrice": 12.99,
  "branchScope": null,
  "tags": ["burgers", "bestseller"],
  "extension": {
    "generateKitchenTicket": true,
    "prepStation": "GRILL",
    "isRecipeBased": true,
    "payload": {
      "allergens": ["gluten", "dairy"],
      "availabilityWindows": [
        { "day": "MON-FRI", "from": "11:00", "to": "22:00" },
        { "day": "SAT-SUN", "from": "10:00", "to": "23:00" }
      ],
      "serviceModePricing": {
        "DINE_IN":  12.99,
        "TAKEAWAY": 11.99,
        "DELIVERY": 13.99
      }
    }
  },
  "recipeLines": [
    { "ingredientId": "ent_beef_patty", "quantity": 200, "unit": "g", "wasteFactor": 5 },
    { "ingredientId": "ent_brioche_bun", "quantity": 1,   "unit": "unit", "wasteFactor": 2 },
    { "ingredientId": "ent_cheddar",    "quantity": 30,  "unit": "g", "wasteFactor": 0 }
  ]
}

// Response
{
  "id": "ent_xyz789",
  "entityType": "MENU_ITEM",
  "name": "Classic Cheeseburger",
  "status": "DRAFT",
  "capabilities": {
    "CAN_CONSUME_INGREDIENTS":     true,
    "CAN_GENERATE_KITCHEN_TICKET": true,
    "CAN_HAVE_VARIANTS":           false,
    "CAN_REQUIRE_BOOKING":         false
  },
  "createdAt": "2026-06-21T12:00:00Z"
}
```

---

### 6.2 Create Entity (Fashion — Product with Variants)

**POST** `/api/v1/entities`

```jsonc
// Request
{
  "tenantId": "ten_def456",
  "entityType": "PRODUCT",
  "name": "Classic Oxford Shirt",
  "status": "DRAFT",
  "taxClass": "APPAREL_STANDARD",
  "basePrice": 89.99,
  "tags": ["shirts", "formal", "summer-2026"],
  "extension": {
    "hasVariants": true,
    "trackInventory": true,
    "reorderPoint": 5,
    "reorderQty": 20,
    "payload": {
      "brand": "Adeera Basics",
      "collection": "Summer 2026",
      "gender": "MENS",
      "material": "100% Cotton",
      "costPrice": 28.00,
      "supplierId": "sup_gh789",
      "leadTimeDays": 14,
      "variantAxes": ["size", "color"],
      "markdownRules": [
        { "daysOnShelf": 90,  "markdownPct": 20 },
        { "daysOnShelf": 180, "markdownPct": 40 }
      ]
    }
  },
  "variants": [
    { "attributes": { "size": "S", "color": "Navy" },  "sku": "OXF-S-NAV", "costPrice": 28.00 },
    { "attributes": { "size": "M", "color": "Navy" },  "sku": "OXF-M-NAV", "costPrice": 28.00 },
    { "attributes": { "size": "L", "color": "White" }, "sku": "OXF-L-WHT", "costPrice": 28.00 }
  ]
}
```

---

### 6.3 Get Price (context-aware)

**POST** `/api/v1/pricing/calculate`

```jsonc
// Request
{
  "entityId":   "ent_xyz789",
  "tenantId":   "ten_abc123",
  "branchId":   "br_main",
  "channelType": "DINE_IN",
  "timestamp":  "2026-06-21T18:30:00Z"
}

// Response
{
  "basePrice":       12.99,
  "finalPrice":      9.99,
  "discountApplied": 3.00,
  "discountReason":  "HAPPY_HOUR",
  "currency":        "USD",
  "taxExcluded":     true
}
```

---

### 6.4 Commit Sale

**POST** `/api/v1/sales`

```jsonc
// Request
{
  "tenantId": "ten_abc123",
  "branchId": "br_main",
  "lines": [
    { "entityId": "ent_xyz789", "quantity": 2, "channelType": "DINE_IN" },
    { "entityId": "ent_cola",   "quantity": 2, "channelType": "DINE_IN" }
  ],
  "payment": {
    "method": "CASH",
    "amountTendered": 30.00
  }
}

// Response
{
  "saleId": "sale_001",
  "total":  25.96,
  "tax":     2.34,
  "change":  4.04,
  "events": [
    "KITCHEN_TICKET_SENT",
    "INVENTORY_DEDUCTED",
    "RECEIPT_GENERATED"
  ]
}
```

---

## 7. Validation Rules & Error Messages

Validation profiles are set per blueprint (`validationProfile: "STRICT" | "STANDARD" | "LENIENT"`).

| Rule | Condition | Error Message (Business Language) |
|---|---|---|
| `required_name` | `name` is empty | "Every menu item needs a name before it can be saved." |
| `required_price` | `base_price` is null or ≤ 0 | "Please enter a selling price before continuing." |
| `recipe_has_ingredients` | `is_recipe_based = true` but `recipeLines` is empty | "You've set this as recipe-tracked but haven't added any ingredients yet." |
| `variant_sku_unique` | Duplicate SKU within tenant | "The SKU '{sku}' is already used by another product. Each variant needs a unique code." |
| `reorder_point_positive` | `reorder_point` < 0 | "Reorder point must be a positive number." |
| `booking_needs_duration` | `requires_booking = true` but `duration_minutes` is null | "Bookable services must have a set duration so your calendar works correctly." |
| `cost_not_exceed_price` | `cost_price` ≥ `base_price` | "Your cost price is equal to or higher than your selling price — this means zero or negative margin." |
| `branch_scope_exists` | Branch ID in `branch_scope` not found | "One or more branches you selected don't exist. Please review your branch selection." |

---

## 8. Superadmin Blueprint Controls

Exposed in the Superadmin panel — one set of controls per tenant blueprint assignment.

```jsonc
{
  "tenantId": "ten_abc123",
  "blueprintOverrides": {
    "allowedEntityTypes":   ["MENU_ITEM", "INGREDIENT", "COMBO"],
    "variantPolicy":        "NONE",               // NONE | SIMPLE | FULL_MATRIX
    "inventoryPolicy":      "RECIPE_BASED",       // RECIPE_BASED | SKU_BASED | MIXED | NONE
    "pricingPolicy":        "TIME_WINDOW",        // STANDARD | TIME_WINDOW | MARKDOWN | STAFF_TIER
    "workflowPolicy":       "WIZARD",             // QUICK_ADD | WIZARD
    "bulkImportEnabled":    true,
    "bulkImportTemplate":   "restaurant_menu_import_v1.xlsx",
    "validationProfile":    "STRICT",
    "enginesEnabled": {
      "inventory":   true,
      "kitchen":     true,
      "booking":     false,
      "procurement": true
    }
  }
}
```

---

## 9. Adding a New Vertical — Worked Example: Dental Clinic

Demonstrating zero new engine code is needed.

```jsonc
{
  "vertical": "DENTAL_CLINIC",
  "version": 1,
  "displayName": "Dental Clinic",
  "language": {
    "entity_singular": "Treatment",
    "entity_plural":   "Treatments",
    "inventory_unit":  "Session",
    "add_entity_cta":  "Add Treatment"
  },
  "primaryEntity": "TREATMENT",
  "supportedEntityTypes": ["TREATMENT", "PRODUCT"],
  "engines": {
    "inventory":   { "enabled": true,  "mode": "CONSUMABLE_ESTIMATE" },
    "pricing":     { "enabled": true,  "strategy": "STANDARD" },
    "tax":         { "enabled": true  },
    "booking":     { "enabled": true  },
    "kitchen":     { "enabled": false },
    "procurement": { "enabled": true  },
    "reporting":   { "enabled": true  }
  },
  "capabilities": {
    "TREATMENT": {
      "CAN_TRACK_INVENTORY":         false,
      "CAN_CONSUME_INGREDIENTS":     true,
      "CAN_GENERATE_KITCHEN_TICKET": false,
      "CAN_HAVE_VARIANTS":           false,
      "CAN_REQUIRE_BOOKING":         true,
      "CAN_REQUIRE_STAFF":           true,
      "CAN_BE_DELIVERED":            false,
      "CAN_BE_RESERVED":             false,
      "CAN_GENERATE_WORK_ORDER":     false,
      "CAN_EARN_LOYALTY":            false
    }
  },
  "creationWorkflow": {
    "TREATMENT": {
      "mode": "WIZARD",
      "steps": [
        { "id": "identity",      "label": "Treatment Details",   "fields": ["name", "category", "description", "images"] },
        { "id": "clinical",      "label": "Clinical Settings",   "fields": ["payload.tooth_category", "payload.procedure_code", "payload.notes_template"] },
        { "id": "scheduling",    "label": "Scheduling",          "fields": ["duration_minutes", "requires_staff", "payload.min_gap_days"] },
        { "id": "pricing",       "label": "Pricing & Insurance", "fields": ["base_price", "tax_class", "payload.insurance_codes"] },
        { "id": "consumables",   "label": "Consumables Used",    "fields": ["recipe_lines"] }
      ]
    }
  },
  "requiredFields": {
    "TREATMENT": ["name", "base_price", "duration_minutes", "requires_staff"]
  },
  "navigation": {
    "primary": ["Treatments", "Appointments", "Patients", "Billing", "Reports"],
    "settings": ["Staff", "Rooms", "Insurance Codes", "Branches"]
  }
}
```

**Result**: Dental clinic onboarded. No new engine code written. Booking Engine, Tax Engine, Inventory Engine (consumable mode), and Reporting Engine all work automatically because the capabilities are correctly flagged.

---

## 10. Implementation Roadmap

| Phase | Deliverable | Why First |
|---|---|---|
| **1** | `entities`, `entity_extensions`, `entity_capability_flags` tables | Foundation for everything else |
| **2** | `blueprints` table + blueprint registry loader | Required before any tenant can onboard |
| **3** | Sales Engine + Tax Engine | Revenue path must work |
| **4** | Inventory Engine (SKU mode) | Shared by fashion, pharmacy, retail |
| **5** | Inventory Engine (recipe mode) | Unlocks restaurant vertical |
| **6** | Pricing Engine (interface + STANDARD strategy) | Required for all verticals |
| **7** | Pricing Engine (TIME_WINDOW + MARKDOWN strategies) | Restaurant and fashion full capability |
| **8** | Blueprint versioning + migration graph | Lock in before live tenant count grows |
| **9** | Booking Engine | Unlocks spa, hotel, clinic, mechanic verticals |
| **10** | Reporting Engine + vertical report registry | Full analytics layer |

---

## 11. Key Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Single `entities` table, not per-vertical tables | Enables unified queries, reporting, and search across all entity types without JOIN explosion |
| Typed extension columns promoted from JSON | Balance between query performance and flexibility; avoids premature over-engineering |
| Capabilities as first-class flags | Engines subscribe to capabilities — adding a new industry never touches engine code |
| Blueprint as JSON stored in DB | Superadmin can adjust blueprint config without a deployment |
| Blueprint versioning from day one | Prevents migration nightmares once live tenants exist |
| Business-language error messages | Validation messages tied to blueprint `language` block — error messages are tenant-vertical aware |
| Sales Engine as orchestrator | Single entry point for all sale commits ensures engine execution order is always correct |
