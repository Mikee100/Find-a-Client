import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/common/cache/cache.service';
import type {
  ITaxEngine,
  TaxContext,
  TaxResult,
  TaxClass,
  TaxedCart,
  CartLine,
} from './engine.interfaces';

/**
 * Tax Engine — calculates tax per entity, applies to cart lines.
 *
 * Tax classes are configured at tenant level.
 * Tax behaviour (inclusive vs exclusive, rates) is entirely data-driven.
 * This engine has zero knowledge of verticals.
 */
@Injectable()
export class TaxEngine implements ITaxEngine {
  private readonly logger = new Logger(TaxEngine.name);
  private readonly CACHE_TTL = 300; // 5 min — tax classes rarely change

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async calculateTax(entityId: string, price: number, context: TaxContext): Promise<TaxResult> {
    const entity = await this.prisma.entity.findUniqueOrThrow({
      where: { id: entityId },
      select: { taxClass: true },
    });

    const taxClass = await this.resolveTaxClass(context.tenantId, entity.taxClass ?? 'STANDARD');

    return this.applyTaxClass(price, taxClass);
  }

  async getTaxClasses(tenantId: string): Promise<TaxClass[]> {
    const cacheKey = `tax-classes:${tenantId}`;
    const cached = await this.cache.get<TaxClass[]>(cacheKey);
    if (cached) return cached;

    const classes = await this.prisma.taxClass.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });

    const result: TaxClass[] = classes.map((c) => ({
      id: c.id,
      name: c.name,
      rate: Number(c.rate),
      inclusive: c.inclusive,
      appliesToChannel: c.appliesToChannel as string[] | null,
    }));

    await this.cache.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async applyTaxToCart(cart: CartLine[], context: TaxContext): Promise<TaxedCart> {
    let subtotal = 0;
    let totalTax = 0;

    const lines = await Promise.all(
      cart.map(async (line) => {
        const taxResult = await this.calculateTax(line.entityId, line.unitPrice, context);
        const lineTax = taxResult.taxAmount * line.quantity;
        const lineTotal = line.unitPrice * line.quantity + (taxResult.inclusive ? 0 : lineTax);

        subtotal += line.unitPrice * line.quantity;
        totalTax += lineTax;

        return {
          ...line,
          taxResult,
          lineTotal: Math.round(lineTotal * 100) / 100,
        };
      }),
    );

    return {
      lines,
      subtotal: Math.round(subtotal * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      grandTotal: Math.round((subtotal + totalTax) * 100) / 100,
    };
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async resolveTaxClass(tenantId: string, taxClassKey: string): Promise<TaxClass> {
    const classes = await this.getTaxClasses(tenantId);
    const found = classes.find((c) => c.name === taxClassKey || c.id === taxClassKey);

    // Fallback: zero tax if class not found (fail safe, not fail hard)
    if (!found) {
      this.logger.warn(`Tax class '${taxClassKey}' not found for tenant ${tenantId} — using zero rate`);
      return { id: 'zero', name: 'ZERO', rate: 0, inclusive: false, appliesToChannel: null };
    }

    return found;
  }

  private applyTaxClass(price: number, taxClass: TaxClass): TaxResult {
    const taxAmount = taxClass.inclusive
      ? price - price / (1 + taxClass.rate / 100)
      : (price * taxClass.rate) / 100;

    return {
      taxableAmount: price,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate: taxClass.rate,
      taxClassName: taxClass.name,
      inclusive: taxClass.inclusive,
    };
  }
}
