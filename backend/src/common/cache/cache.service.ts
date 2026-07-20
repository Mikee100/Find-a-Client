import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

type MemoryValue = {
  value: string;
  expiresAt: number;
};

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly memoryStore = new Map<string, MemoryValue>();
  private readonly namespaceVersions = new Map<string, number>();
  private readonly redis: Redis | null;
  private readonly metricsLogEvery: number;
  private readonly metrics = {
    getHits: 0,
    getMisses: 0,
    sets: 0,
    deletes: 0,
    namespaceInvalidations: 0
  };

  constructor(private readonly configService: ConfigService) {
    const configuredMetricsLogEvery = Number(this.configService.get<string>("CACHE_METRICS_LOG_EVERY", "200"));
    this.metricsLogEvery = Number.isFinite(configuredMetricsLogEvery) && configuredMetricsLogEvery > 0 ? configuredMetricsLogEvery : 200;

    const redisUrl = this.configService.get<string>("REDIS_URL", "").trim();

    if (!redisUrl) {
      this.redis = null;
      return;
    }

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableReadyCheck: false
    });

    this.redis.on("error", (error) => {
      this.logger.warn(`Redis unavailable, falling back to memory cache: ${error.message}`);
    });

    void this.redis.connect().catch(() => {
      this.logger.warn("Failed to connect to Redis. In-memory cache will be used.");
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) {
      return;
    }

    await this.redis.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      const value = await this.redis.get(key).catch(() => null);
      if (!value) {
        this.track("getMisses");
        return null;
      }

      const parsed = this.parseValue<T>(value);
      this.track(parsed === null ? "getMisses" : "getHits");
      return parsed;
    }

    const now = Date.now();
    const hit = this.memoryStore.get(key);

    if (!hit) {
      this.track("getMisses");
      return null;
    }

    if (hit.expiresAt <= now) {
      this.memoryStore.delete(key);
      this.track("getMisses");
      return null;
    }

    const parsed = this.parseValue<T>(hit.value);
    this.track(parsed === null ? "getMisses" : "getHits");
    return parsed;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const payload = JSON.stringify(value);
    this.track("sets");

    if (this.redis) {
      await this.redis.set(key, payload, "EX", ttlSeconds).catch(() => undefined);
      return;
    }

    this.memoryStore.set(key, {
      value: payload,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }

  async del(key: string): Promise<void> {
    this.track("deletes");

    if (this.redis) {
      await this.redis.del(key).catch(() => undefined);
      return;
    }

    this.memoryStore.delete(key);
  }

  async composeKey(namespace: string, rawKey: string): Promise<string> {
    const version = await this.getNamespaceVersion(namespace);
    return `${namespace}:v${version}:${rawKey}`;
  }

  async invalidateNamespace(namespace: string): Promise<void> {
    this.track("namespaceInvalidations");

    if (this.redis) {
      const versionKey = this.namespaceVersionKey(namespace);
      await this.redis.incr(versionKey).catch(() => undefined);
      return;
    }

    const current = this.namespaceVersions.get(namespace) ?? 1;
    this.namespaceVersions.set(namespace, current + 1);
  }

  private async getNamespaceVersion(namespace: string): Promise<number> {
    if (this.redis) {
      const versionKey = this.namespaceVersionKey(namespace);
      const stored = await this.redis.get(versionKey).catch(() => null);

      if (stored) {
        const value = Number(stored);
        return Number.isFinite(value) && value > 0 ? value : 1;
      }

      await this.redis.set(versionKey, "1").catch(() => undefined);
      return 1;
    }

    const current = this.namespaceVersions.get(namespace);
    if (current) {
      return current;
    }

    this.namespaceVersions.set(namespace, 1);
    return 1;
  }

  private namespaceVersionKey(namespace: string): string {
    return `namespace-version:${namespace}`;
  }

  private track(metric: keyof CacheService["metrics"]) {
    this.metrics[metric] += 1;

    const totalReads = this.metrics.getHits + this.metrics.getMisses;
    const shouldLog = totalReads > 0 && totalReads % this.metricsLogEvery === 0;
    if (!shouldLog) {
      return;
    }

    const hitRate = Math.round((this.metrics.getHits / totalReads) * 10000) / 100;
    this.logger.log(
      `cache-stats reads=${totalReads} hitRate=${hitRate}% hits=${this.metrics.getHits} misses=${this.metrics.getMisses} sets=${this.metrics.sets} deletes=${this.metrics.deletes} invalidations=${this.metrics.namespaceInvalidations}`
    );
  }

  private parseValue<T>(value: string): T | null {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
}
