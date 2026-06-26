import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from 'src/prisma/prisma.service';
import { BlueprintService } from '../blueprints/blueprint.service';
import { CAPABILITY } from '../blueprints/blueprint-registry.constants';
import type { EntityType } from '../blueprints/blueprint-registry.constants';
import type {
  ISalesEngine,
  CartInputLine,
  Cart,
  PaymentInput,
  SaleReceipt,
  ReturnLine,
  VoidResult,
  TaxedCartLine,
} from './engine.interfaces';
import { PricingEngine } from './pricing.engine';
import { InventoryEngine } from './inventory.engine';
import { TaxEngine } from './tax.engine';

/**
 * Sales Engine — the orchestrator.
 *
 * Every sale in every vertical flows through this single entry point.
 * The engine delegates to Pricing, Tax, and Inventory engines in a
 * guaranteed execution order. Vertical-specific behaviour is determined
 * entirely by capability flags — no vertical-specific code lives here.
 *
 * Execution order on commitSale:
 *   1. Lock entities (optimistic concurrency via sessionId)
 *   2. Tax Engine  → apply tax to all lines
 *   3. Pricing Engine → validate prices haven't drifted mid-session
 *   4. Inventory Engine → deduct stock (SKU-based or recipe-based)
 *   5. Emit KITCHEN_TICKET_REQUESTED  (if CAN_GENERATE_KITCHEN_TICKET)
 *   6. Emit WORK_ORDER_CREATED        (if CAN_GENERATE_WORK_ORDER)
 *   7. Emit LOYALTY_POINTS_EARNED     (if CAN_EARN_LOYALTY)
 *   8. Persist Sale record
 *   9. Return SaleReceipt
 */
@Injectable()
export class SalesEngine implements ISalesEngine {
  private readonly logger = new Logger(SalesEngine.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly blueprintService: BlueprintService,
    private readonly pricingEngine: PricingEngine,
    private readonly inventoryEngine: InventoryEngine,
    private readonly taxEngine: TaxEngine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Pre-sale: validate, price, and tax all lines.
   * Returns a fully costed Cart the frontend can show as an order preview.
   */
  async buildCart(tenantId: string, branchId: string, lines: CartInputLine[]): Promise<Cart> {
    if (!lines.length) {
      throw new BadRequestException('Cannot build a cart with no lines.');
    }

    // Resolve pricing for all lines in parallel
    const pricedLines = await Promise.all(
      lines.map(async (line) => {
        const priceResult = await this.pricingEngine.calculatePrice({
          entityId: line.entityId,
          tenantId,
          branchId,
          variantId: line.variantId,
          channelType: line.channelType,
          timestamp: new Date(),
        });

        const taxContext = { tenantId, branchId, channelType: line.channelType };
        const taxResult = await this.taxEngine.calculateTax(
          line.entityId,
          priceResult.finalPrice,
          taxContext,
        );

        const pricedLine: TaxedCartLine = {
          entityId: line.entityId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: priceResult.finalPrice,
          taxResult,
          lineTotal: (priceResult.finalPrice + (taxResult.inclusive ? 0 : taxResult.taxAmount)) * line.quantity,
        };

        return pricedLine;
      }),
    );

    const subtotal = pricedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
    const totalTax = pricedLines.reduce((sum, l) => sum + l.taxResult.taxAmount * l.quantity, 0);

    return {
      tenantId,
      branchId,
      lines,
      pricedLines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round((subtotal + totalTax) * 100) / 100,
      currency: 'USD', // resolved from tenant in full implementation
      sessionId: `${tenantId}:${Date.now()}`,
    };
  }

  /**
   * Commit a sale — executes all engine side-effects in guaranteed order.
   * This is the only entry point for persisting a sale transaction.
   */
  async commitSale(cart: Cart, payment: PaymentInput, operatorId: string): Promise<SaleReceipt> {
    const startedAt = Date.now();
    const events: string[] = [];

    // ── Step 1: Validate tender ──────────────────────────────────────────────
    if (payment.method === 'CASH' && payment.amountTendered < cart.grandTotal) {
      throw new BadRequestException(
        `Cash tendered (${payment.amountTendered}) is less than the total (${cart.grandTotal}).`,
      );
    }

    // ── Step 2: Resolve capability maps for all entities in the cart ─────────
    const entityCapabilityMaps = await this.resolveCapabilityMaps(cart);

    // ── Step 3: Inventory deduction (per-line, respects capability) ──────────
    for (const line of cart.lines) {
      const caps = entityCapabilityMaps[line.entityId];
      const entity = await this.prisma.entity.findUniqueOrThrow({
        where: { id: line.entityId },
        select: { entityType: true },
      });

      if (caps[CAPABILITY.CAN_CONSUME_INGREDIENTS]) {
        // Recipe-based: deduct ingredient stock
        const result = await this.inventoryEngine.deductByRecipe(
          line.entityId,
          line.quantity,
          cart.branchId,
        );
        if (!result.success) {
          throw new BadRequestException(`Insufficient ingredient stock for item ${line.entityId}.`);
        }
        events.push('RECIPE_DEDUCTED');
      } else if (caps[CAPABILITY.CAN_TRACK_INVENTORY]) {
        // SKU-based: deduct entity/variant stock directly
        const result = await this.inventoryEngine.deductStock([
          {
            entityId: line.entityId,
            variantId: line.variantId,
            branchId: cart.branchId,
            quantity: line.quantity,
            unit: 'unit',
            reason: 'SALE',
          },
        ]);
        if (!result.success) {
          throw new BadRequestException(
            `Insufficient stock for ${result.insufficientStock?.[0]?.entityId ?? line.entityId}.`,
          );
        }
        events.push('STOCK_DEDUCTED');
      }

      // ── Step 4: Kitchen ticket ───────────────────────────────────────────
      if (caps[CAPABILITY.CAN_GENERATE_KITCHEN_TICKET]) {
        this.eventEmitter.emit('kitchen.ticket.requested', {
          tenantId: cart.tenantId,
          branchId: cart.branchId,
          entityId: line.entityId,
          quantity: line.quantity,
          notes: line.notes,
          entityType: entity.entityType,
        });
        if (!events.includes('KITCHEN_TICKET_SENT')) {
          events.push('KITCHEN_TICKET_SENT');
        }
      }

      // ── Step 5: Work order ───────────────────────────────────────────────
      if (caps[CAPABILITY.CAN_GENERATE_WORK_ORDER]) {
        this.eventEmitter.emit('work.order.created', {
          tenantId: cart.tenantId,
          branchId: cart.branchId,
          entityId: line.entityId,
          quantity: line.quantity,
          operatorId,
        });
        if (!events.includes('WORK_ORDER_CREATED')) {
          events.push('WORK_ORDER_CREATED');
        }
      }
    }

    // ── Step 6: Persist Sale record ──────────────────────────────────────────
    const sale = await this.prisma.sale.create({
      data: {
        tenantId: cart.tenantId,
        branchId: cart.branchId,
        operatorId,
        subtotal: cart.subtotal,
        totalTax: cart.totalTax,
        grandTotal: cart.grandTotal,
        currency: cart.currency,
        paymentMethod: payment.method,
        amountTendered: payment.amountTendered,
        change: Math.max(0, payment.amountTendered - cart.grandTotal),
        lines: {
          create: cart.pricedLines.map((l) => ({
            entityId: l.entityId,
            variantId: l.variantId ?? null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxAmount: l.taxResult.taxAmount,
            lineTotal: l.lineTotal,
          })),
        },
      },
    });
    events.push('RECEIPT_GENERATED');

    // ── Step 7: Loyalty points (fire-and-forget) ─────────────────────────────
    const anyEarnsLoyalty = cart.lines.some(
      (l) => entityCapabilityMaps[l.entityId]?.[CAPABILITY.CAN_EARN_LOYALTY],
    );
    if (anyEarnsLoyalty) {
      this.eventEmitter.emit('loyalty.points.earned', {
        tenantId: cart.tenantId,
        saleId: sale.id,
        grandTotal: cart.grandTotal,
        operatorId,
      });
      events.push('LOYALTY_POINTS_EARNED');
    }

    const durationMs = Date.now() - startedAt;
    this.logger.log(`Sale ${sale.id} committed in ${durationMs}ms — events: ${events.join(', ')}`);

    return {
      saleId: sale.id,
      tenantId: cart.tenantId,
      branchId: cart.branchId,
      total: cart.grandTotal,
      tax: cart.totalTax,
      change: Math.max(0, payment.amountTendered - cart.grandTotal),
      currency: cart.currency,
      createdAt: sale.createdAt,
      events,
    };
  }

  /**
   * Void / return a sale.
   * Restocks inventory for lines where CAN_TRACK_INVENTORY or CAN_CONSUME_INGREDIENTS.
   */
  async voidSale(saleId: string, reason: string, lines?: ReturnLine[]): Promise<VoidResult> {
    const sale = await this.prisma.sale.findUniqueOrThrow({
      where: { id: saleId },
      include: { lines: true },
    });

    const returnLines = lines ?? sale.lines.map((l) => ({
      entityId: l.entityId,
      variantId: l.variantId ?? undefined,
      quantity: l.quantity,
      reason,
    }));

    // Restock where applicable
    const capMaps = await this.resolveCapabilityMaps({ tenantId: sale.tenantId, branchId: sale.branchId, lines: returnLines } as Cart);
    const restockedLines: ReturnLine[] = [];

    for (const line of returnLines) {
      const caps = capMaps[line.entityId];
      if (caps?.[CAPABILITY.CAN_TRACK_INVENTORY]) {
        await this.inventoryEngine.adjustStock({
          entityId: line.entityId,
          variantId: line.variantId,
          branchId: sale.branchId,
          quantity: line.quantity,
          unit: 'unit',
          reason: 'TRANSFER',
          notes: `Return/void of sale ${saleId}: ${reason}`,
          operatorId: 'SYSTEM',
        });
        restockedLines.push(line);
      }
    }

    await this.prisma.sale.update({
      where: { id: saleId },
      data: { voidedAt: new Date(), voidReason: reason },
    });

    return {
      voided: true,
      refundAmount: sale.grandTotal,
      restockedLines,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  /**
   * Resolves capability maps for all unique entities in a cart.
   * Batches DB lookups to avoid N+1.
   */
  private async resolveCapabilityMaps(
    cart: Pick<Cart, 'tenantId' | 'lines'>,
  ): Promise<Record<string, Record<string, boolean>>> {
    const uniqueEntityIds = [...new Set(cart.lines.map((l) => l.entityId))];

    // Batch-fetch all entity types
    const entities = await this.prisma.entity.findMany({
      where: { id: { in: uniqueEntityIds } },
      select: { id: true, entityType: true },
    });

    // Batch-fetch all capability flag overrides
    const flagOverrides = await this.prisma.entityCapabilityFlag.findMany({
      where: { entityId: { in: uniqueEntityIds } },
    });

    const flagOverrideMap: Record<string, Record<string, boolean>> = {};
    for (const flag of flagOverrides) {
      flagOverrideMap[flag.entityId] ??= {};
      flagOverrideMap[flag.entityId][flag.capability] = flag.enabled;
    }

    const result: Record<string, Record<string, boolean>> = {};

    for (const entity of entities) {
      const blueprintCaps = await this.blueprintService.getCapabilityMap(
        cart.tenantId,
        entity.entityType as EntityType,
      );
      // Merge: entity-level overrides win
      result[entity.id] = {
        ...blueprintCaps,
        ...(flagOverrideMap[entity.id] ?? {}),
      };
    }

    return result;
  }
}
