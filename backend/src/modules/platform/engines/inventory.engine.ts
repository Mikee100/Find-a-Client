import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  IInventoryEngine,
  StockLevel,
  StockDeductionLine,
  StockDeductionResult,
  RecipeDeductionResult,
  StockReceiptLine,
  StockAdjustment,
  ReorderAlert,
} from './engine.interfaces';

/**
 * Inventory Engine — handles both SKU-based and recipe-based stock management.
 *
 * Mode is determined by blueprint config (SKU_BASED | RECIPE_BASED | CONSUMABLE_ESTIMATE).
 * No vertical-specific code lives here — the Sales Engine tells this engine
 * which deduction method to use based on capability flags.
 *
 * All writes use transactions with optimistic locking to prevent
 * over-deduction under concurrent load.
 */
@Injectable()
export class InventoryEngine implements IInventoryEngine {
  private readonly logger = new Logger(InventoryEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStockLevel(entityId: string, variantId?: string, branchId?: string): Promise<StockLevel> {
    const where = {
      entityId,
      ...(variantId ? { variantId } : { variantId: null }),
      ...(branchId ? { branchId } : {}),
    };

    const stock = await this.prisma.inventoryStock.findFirst({ where });

    if (!stock) {
      return {
        entityId,
        variantId,
        branchId: branchId ?? '',
        onHand: 0,
        reserved: 0,
        available: 0,
        unit: 'unit',
        belowReorder: false,
      };
    }

    const entity = await this.prisma.entity.findUnique({
      where: { id: entityId },
      include: { extension: true },
    });

    const reorderPoint = Number(entity?.extension?.reorderPoint ?? 0);
    const available = stock.onHand - stock.reserved;

    return {
      entityId,
      variantId: stock.variantId ?? undefined,
      branchId: stock.branchId,
      onHand: stock.onHand,
      reserved: stock.reserved,
      available,
      unit: stock.unit,
      belowReorder: available <= reorderPoint,
    };
  }

  /**
   * SKU-based stock deduction — used for Fashion, Pharmacy, Retail.
   * Uses a transaction with row-level locking to prevent race conditions.
   */
  async deductStock(lines: StockDeductionLine[]): Promise<StockDeductionResult> {
    const insufficientStock: StockDeductionResult['insufficientStock'] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const line of lines) {
        // Row-lock the stock record
        const stock = await tx.$queryRaw<
          { id: string; on_hand: number; reserved: number; unit: string }[]
        >`
          SELECT id, on_hand, reserved, unit
          FROM "InventoryStock"
          WHERE "entityId" = ${line.entityId}::uuid
            ${line.variantId ? tx.$queryRaw`AND "variantId" = ${line.variantId}::uuid` : tx.$queryRaw`AND "variantId" IS NULL`}
            AND "branchId" = ${line.branchId}::uuid
          FOR UPDATE
          LIMIT 1
        `;

        const record = stock[0];
        const available = record ? record.on_hand - record.reserved : 0;

        if (available < line.quantity) {
          insufficientStock.push({
            entityId: line.entityId,
            available,
            requested: line.quantity,
          });
          continue;
        }

        if (record) {
          await tx.inventoryStock.update({
            where: { id: record.id },
            data: { onHand: { decrement: line.quantity } },
          });
        }

        await tx.inventoryMovement.create({
          data: {
            entityId: line.entityId,
            variantId: line.variantId ?? null,
            branchId: line.branchId,
            quantity: -line.quantity,
            unit: line.unit,
            reason: line.reason,
          },
        });
      }

      if (insufficientStock.length > 0) {
        throw new BadRequestException(
          `Insufficient stock for ${insufficientStock.length} item(s). Transaction rolled back.`,
        );
      }
    });

    return { success: true, deducted: lines, insufficientStock: [] };
  }

  /**
   * Recipe-based deduction — used for Restaurant, Manufacturing.
   * Deducts each ingredient in the recipe, accounting for waste factor.
   */
  async deductByRecipe(entityId: string, qty: number, branchId: string): Promise<RecipeDeductionResult> {
    const recipeLines = await this.prisma.recipeLine.findMany({
      where: { entityId },
      include: { ingredient: true },
    });

    if (!recipeLines.length) {
      this.logger.warn(`No recipe found for entity ${entityId} — skipping ingredient deduction.`);
      return { success: true, ingredientsDeducted: [] };
    }

    const deductions: StockDeductionLine[] = recipeLines.map((line) => {
      const wasteFactor = 1 + Number(line.wasteFactor) / 100;
      const requiredQty = Number(line.quantity) * qty * wasteFactor;

      return {
        entityId: line.ingredientId,
        branchId,
        quantity: requiredQty,
        unit: line.unit,
        reason: 'RECIPE',
      };
    });

    const result = await this.deductStock(deductions);

    return {
      success: result.success,
      ingredientsDeducted: deductions.map((d) => ({
        ingredientId: d.entityId,
        qty: d.quantity,
        unit: d.unit,
      })),
    };
  }

  async receiveStock(lines: StockReceiptLine[]): Promise<void> {
    await this.prisma.$transaction(
      lines.map((line) =>
        this.prisma.inventoryStock.upsert({
          where: {
            entityId_variantId_branchId: {
              entityId: line.entityId,
              variantId: line.variantId ?? null,
              branchId: line.branchId,
            },
          },
          update: { onHand: { increment: line.quantity } },
          create: {
            entityId: line.entityId,
            variantId: line.variantId ?? null,
            branchId: line.branchId,
            onHand: line.quantity,
            reserved: 0,
            unit: 'unit',
          },
        }),
      ),
    );

    // Record movements
    await this.prisma.inventoryMovement.createMany({
      data: lines.map((line) => ({
        entityId: line.entityId,
        variantId: line.variantId ?? null,
        branchId: line.branchId,
        quantity: line.quantity,
        unit: line.unit ?? 'unit',
        reason: 'TRANSFER',
        referenceId: line.purchaseOrderId ?? null,
      })),
    });
  }

  async adjustStock(adjustment: StockAdjustment): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.inventoryStock.upsert({
        where: {
          entityId_variantId_branchId: {
            entityId: adjustment.entityId,
            variantId: adjustment.variantId ?? null,
            branchId: adjustment.branchId,
          },
        },
        update: { onHand: { increment: adjustment.quantity } },
        create: {
          entityId: adjustment.entityId,
          variantId: adjustment.variantId ?? null,
          branchId: adjustment.branchId,
          onHand: Math.max(0, adjustment.quantity),
          reserved: 0,
          unit: adjustment.unit,
        },
      }),
      this.prisma.inventoryMovement.create({
        data: {
          entityId: adjustment.entityId,
          variantId: adjustment.variantId ?? null,
          branchId: adjustment.branchId,
          quantity: adjustment.quantity,
          unit: adjustment.unit,
          reason: adjustment.reason,
          notes: adjustment.notes ?? null,
          operatorId: adjustment.operatorId,
        },
      }),
    ]);

    this.logger.log(
      `Stock adjusted: entity=${adjustment.entityId} qty=${adjustment.quantity} reason=${adjustment.reason}`,
    );
  }

  async getReorderAlerts(tenantId: string, branchId?: string): Promise<ReorderAlert[]> {
    const entities = await this.prisma.entity.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        extension: true,
        inventoryStock: branchId ? { where: { branchId } } : true,
      },
    });

    const alerts: ReorderAlert[] = [];

    for (const entity of entities) {
      const reorderPoint = Number(entity.extension?.reorderPoint ?? 0);
      if (reorderPoint === 0) continue;

      for (const stock of entity.inventoryStock) {
        const available = stock.onHand - stock.reserved;
        if (available <= reorderPoint) {
          alerts.push({
            entityId: entity.id,
            entityName: entity.name,
            branchId: stock.branchId,
            onHand: stock.onHand,
            reorderPoint,
            suggestedQty: Number(entity.extension?.reorderQty ?? reorderPoint * 2),
            supplierId: (entity.extension?.payload as Record<string, unknown>)?.['supplierId'] as string | undefined,
          });
        }
      }
    }

    return alerts;
  }
}
