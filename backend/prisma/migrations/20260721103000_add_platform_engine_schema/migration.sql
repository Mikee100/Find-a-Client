-- CreateTable
CREATE TABLE "Blueprint" (
    "id" UUID NOT NULL,
    "vertical" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "displayName" VARCHAR(100) NOT NULL,
    "schema" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blueprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlueprintMigration" (
    "id" UUID NOT NULL,
    "blueprintId" UUID NOT NULL,
    "fromVersion" INTEGER NOT NULL,
    "toVersion" INTEGER NOT NULL,
    "migrationNotes" TEXT,
    "script" JSONB,
    "breakingChange" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlueprintMigration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "blueprintId" UUID NOT NULL,
    "blueprintVersion" INTEGER NOT NULL DEFAULT 1,
    "blueprintOverrides" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "timezone" VARCHAR(60) NOT NULL DEFAULT 'UTC',
    "currency" CHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entity" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "entityType" VARCHAR(60) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "taxClass" VARCHAR(60),
    "basePrice" DECIMAL(14,4),
    "currency" CHAR(3),
    "branchScope" UUID[],
    "tags" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityExtension" (
    "entityId" UUID NOT NULL,
    "blueprintId" VARCHAR(60) NOT NULL,
    "trackInventory" BOOLEAN NOT NULL DEFAULT false,
    "stockUnit" VARCHAR(30),
    "reorderPoint" DECIMAL(10,3),
    "reorderQty" DECIMAL(10,3),
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "requiresBooking" BOOLEAN NOT NULL DEFAULT false,
    "durationMinutes" INTEGER,
    "requiresStaff" BOOLEAN NOT NULL DEFAULT false,
    "generatesKitchenTicket" BOOLEAN NOT NULL DEFAULT false,
    "prepStation" VARCHAR(60),
    "isRecipeBased" BOOLEAN NOT NULL DEFAULT false,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityExtension_pkey" PRIMARY KEY ("entityId")
);

-- CreateTable
CREATE TABLE "EntityCapabilityFlag" (
    "entityId" UUID NOT NULL,
    "capability" VARCHAR(80) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "source" VARCHAR(20) NOT NULL DEFAULT 'BLUEPRINT',

    CONSTRAINT "EntityCapabilityFlag_pkey" PRIMARY KEY ("entityId","capability")
);

-- CreateTable
CREATE TABLE "EntityVariant" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "sku" VARCHAR(100),
    "barcode" VARCHAR(100),
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "priceOverride" DECIMAL(14,4),
    "costPrice" DECIMAL(14,4),
    "weightGrams" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeLine" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" DECIMAL(10,4) NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "wasteFactor" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecipeLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryStock" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "variantId" UUID,
    "branchId" UUID NOT NULL,
    "onHand" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reserved" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unit" VARCHAR(30) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "variantId" UUID,
    "branchId" UUID NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" VARCHAR(30) NOT NULL,
    "reason" VARCHAR(30) NOT NULL,
    "referenceId" UUID,
    "notes" TEXT,
    "operatorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "operatorId" UUID NOT NULL,
    "subtotal" DECIMAL(14,4) NOT NULL,
    "totalTax" DECIMAL(14,4) NOT NULL,
    "grandTotal" DECIMAL(14,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "paymentMethod" VARCHAR(20) NOT NULL,
    "amountTendered" DECIMAL(14,4) NOT NULL,
    "change" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SaleLine" (
    "id" UUID NOT NULL,
    "saleId" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "variantId" UUID,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "taxAmount" DECIMAL(14,4) NOT NULL,
    "lineTotal" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "SaleLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityPriceRule" (
    "id" UUID NOT NULL,
    "entityId" UUID NOT NULL,
    "ruleType" VARCHAR(40) NOT NULL,
    "params" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityPriceRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxClass" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "inclusive" BOOLEAN NOT NULL DEFAULT false,
    "appliesToChannel" TEXT[],

    CONSTRAINT "TaxClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Blueprint_vertical_key" ON "Blueprint"("vertical");

-- CreateIndex
CREATE INDEX "Blueprint_vertical_idx" ON "Blueprint"("vertical");

-- CreateIndex
CREATE INDEX "BlueprintMigration_blueprintId_toVersion_idx" ON "BlueprintMigration"("blueprintId", "toVersion");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_blueprintId_idx" ON "Tenant"("blueprintId");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "idx_entity_tenant_type" ON "Entity"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "idx_entity_tenant_status" ON "Entity"("tenantId", "status");

-- CreateIndex
CREATE INDEX "idx_entity_tags_gin" ON "Entity" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "idx_ext_blueprint" ON "EntityExtension"("blueprintId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityVariant_sku_key" ON "EntityVariant"("sku");

-- CreateIndex
CREATE INDEX "idx_variant_entity" ON "EntityVariant"("entityId");

-- CreateIndex
CREATE INDEX "idx_variant_attrs_gin" ON "EntityVariant" USING GIN ("attributes");

-- CreateIndex
CREATE INDEX "idx_recipe_entity" ON "RecipeLine"("entityId");

-- CreateIndex
CREATE INDEX "idx_stock_entity" ON "InventoryStock"("entityId");

-- CreateIndex
CREATE INDEX "idx_stock_branch_onhand" ON "InventoryStock"("branchId", "onHand");

-- CreateIndex
CREATE UNIQUE INDEX "uq_stock_entity_variant_branch" ON "InventoryStock"("entityId", "variantId", "branchId");

-- CreateIndex
CREATE INDEX "idx_movement_entity_created" ON "InventoryMovement"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_movement_branch_reason" ON "InventoryMovement"("branchId", "reason");

-- CreateIndex
CREATE INDEX "idx_sale_tenant_created" ON "Sale"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_sale_tenant_branch_created" ON "Sale"("tenantId", "branchId", "createdAt");

-- CreateIndex
CREATE INDEX "idx_sale_voided" ON "Sale"("voidedAt");

-- CreateIndex
CREATE INDEX "idx_saleline_sale" ON "SaleLine"("saleId");

-- CreateIndex
CREATE INDEX "idx_saleline_entity" ON "SaleLine"("entityId");

-- CreateIndex
CREATE INDEX "idx_pricerule_entity_priority" ON "EntityPriceRule"("entityId", "priority");

-- CreateIndex
CREATE INDEX "idx_taxclass_tenant" ON "TaxClass"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_taxclass_tenant_name" ON "TaxClass"("tenantId", "name");

-- CreateIndex
CREATE INDEX "idx_hirerequest_client_status_created_desc" ON "HireRequest"("clientId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_hirerequest_developer_status_created_desc" ON "HireRequest"("developerId", "status", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_user_read_created_desc" ON "Notification"("userId", "isRead", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_notification_user_type_read" ON "Notification"("userId", "type", "isRead");

-- CreateIndex
CREATE INDEX "idx_project_quality_score_desc" ON "Project"("qualityScore" DESC);

-- CreateIndex
CREATE INDEX "idx_project_techstack_gin" ON "Project" USING GIN ("techStack");

-- CreateIndex
CREATE INDEX "idx_project_industries_gin" ON "Project" USING GIN ("industries");

-- CreateIndex
CREATE INDEX "idx_projectlike_user_created_desc" ON "ProjectLike"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_saved_user_created_desc" ON "Saved"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_participant_a_updated_desc" ON "Thread"("participantAId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_participant_b_updated_desc" ON "Thread"("participantBId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_thread_pair_updated_desc" ON "Thread"("participantAId", "participantBId", "updatedAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_role_experience_availability" ON "User"("role", "experienceLevel", "availabilityStatus");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_blueprintId_fkey" FOREIGN KEY ("blueprintId") REFERENCES "Blueprint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityExtension" ADD CONSTRAINT "EntityExtension_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityCapabilityFlag" ADD CONSTRAINT "EntityCapabilityFlag_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityVariant" ADD CONSTRAINT "EntityVariant_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeLine" ADD CONSTRAINT "RecipeLine_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryStock" ADD CONSTRAINT "InventoryStock_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "EntityVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleLine" ADD CONSTRAINT "SaleLine_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityPriceRule" ADD CONSTRAINT "EntityPriceRule_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxClass" ADD CONSTRAINT "TaxClass_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

