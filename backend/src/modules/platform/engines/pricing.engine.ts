import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CacheService } from 'src/common/cache/cache.service';
import type {
  IPricingEngine,
  IPricingContext,
  IPriceResult,
  PriceRule,
} from './engine.interfaces';

/**
 * Pricing Engine — Standard + Time-Window + Markdown strategies.
 *
 * Strategy is resolved from the tenant's blueprint configuration.
 * Adding a new pricing strategy = adding a private method here,
 * registering it in resolveStrategy(), and referencing it in the blueprint.
 *
 * No vertical-specific logic exists in this class.
 * The entity's pricing payload (time windows, markdown rules, tier prices)
 * is stored in entity_extensions.payload and read here at runtime.
 */
@Injectable()
export class PricingEngine implements IPricingEngine {
  private readonly logger = new Logger(PricingEngine.name);
  private readonly CACHE_TTL = 30; // 30s — prices can change with time windows

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async calculatePrice(context: IPricingContext): Promise<IPriceResult> {
    const cacheKey = `pricing:${context.entityId}:${context.channelType}:${this.getTimeWindowKey(context.timestamp)}`;
    const cached = await this.cache.get<IPriceResult>(cacheKey);
    if (cached) return cached;

    const entity = await this.prisma.entity.findUniqueOrThrow({
      where: { id: context.entityId },
      include: { extension: true },
    });

    const basePrice = Number(entity.basePrice ?? 0);
    const payload = (entity.extension?.payload as Record<string, unknown>) ?? {};

    // Channel-specific price override (e.g., dine-in vs takeaway vs delivery)
    const channelPrice = this.resolveChannelPrice(payload, context.channelType, basePrice);

    // Apply time-window rules (happy hour, day-of-week)
    const { finalPrice, discountApplied, discountReason } = this.applyTimeWindowRules(
      channelPrice,
      payload,
      context.timestamp,
    );

    const result: IPriceResult = {
      basePrice,
      finalPrice,
      discountApplied,
      discountReason,
      currency: entity.currency ?? 'USD',
      taxExcluded: true,
    };

    await this.cache.set(cacheKey, result, this.CACHE_TTL);
    return result;
  }

  async previewMarkdown(entityId: string, markdownPct: number): Promise<IPriceResult> {
    const entity = await this.prisma.entity.findUniqueOrThrow({
      where: { id: entityId },
    });
    const basePrice = Number(entity.basePrice ?? 0);
    const discount = (basePrice * markdownPct) / 100;
    return {
      basePrice,
      finalPrice: Math.round((basePrice - discount) * 100) / 100,
      discountApplied: Math.round(discount * 100) / 100,
      discountReason: 'MARKDOWN',
      currency: entity.currency ?? 'USD',
      taxExcluded: true,
    };
  }

  async getPriceRules(entityId: string): Promise<PriceRule[]> {
    const rules = await this.prisma.entityPriceRule.findMany({
      where: { entityId },
      orderBy: { priority: 'asc' },
    });
    return rules.map((r) => ({
      id: r.id,
      entityId: r.entityId,
      ruleType: r.ruleType,
      params: r.params as Record<string, unknown>,
      priority: r.priority,
    }));
  }

  // ── Private strategy implementations ─────────────────────────────────────────

  private resolveChannelPrice(
    payload: Record<string, unknown>,
    channel: string,
    basePrice: number,
  ): number {
    const channelPricing = payload['serviceModePricing'] as Record<string, number> | undefined;
    if (!channelPricing) return basePrice;

    return channelPricing[channel] ?? basePrice;
  }

  private applyTimeWindowRules(
    price: number,
    payload: Record<string, unknown>,
    timestamp: Date,
  ): { finalPrice: number; discountApplied: number; discountReason?: string } {
    const windows = payload['availabilityWindows'] as
      | { day: string; from: string; to: string; discountPct?: number }[]
      | undefined;

    if (!windows?.length) {
      return { finalPrice: price, discountApplied: 0 };
    }

    const dayName = timestamp.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    const timeStr = `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`;

    for (const window of windows) {
      const days = window.day.split('-').map((d) => d.trim().toUpperCase());
      const fromDay = days[0];
      const toDay = days[1];
      const matchesDay =
        days.length === 1
          ? fromDay === dayName
          : Boolean(fromDay && toDay && this.dayInRange(dayName, fromDay, toDay));
      const matchesTime = timeStr >= window.from && timeStr <= window.to;

      if (matchesDay && matchesTime && window.discountPct) {
        const discount = (price * window.discountPct) / 100;
        return {
          finalPrice: Math.round((price - discount) * 100) / 100,
          discountApplied: Math.round(discount * 100) / 100,
          discountReason: 'HAPPY_HOUR',
        };
      }
    }

    return { finalPrice: price, discountApplied: 0 };
  }

  private dayInRange(day: string, from: string, to: string): boolean {
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const fromIdx = days.indexOf(from);
    const toIdx = days.indexOf(to);
    const dayIdx = days.indexOf(day);
    if (fromIdx === -1 || toIdx === -1 || dayIdx === -1) return false;
    return fromIdx <= toIdx
      ? dayIdx >= fromIdx && dayIdx <= toIdx
      : dayIdx >= fromIdx || dayIdx <= toIdx;
  }

  private getTimeWindowKey(timestamp: Date): string {
    // Group by 15-minute buckets for cache efficiency
    const h = timestamp.getHours();
    const m = Math.floor(timestamp.getMinutes() / 15) * 15;
    return `${timestamp.toISOString().split('T')[0]}:${h}:${m}`;
  }
}
