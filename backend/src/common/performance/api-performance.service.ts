import { Injectable } from "@nestjs/common";

const MAX_RECENT_REQUESTS = 300;
const MAX_ROUTE_LATENCY_SAMPLES = 200;

export interface RecentRequestRecord {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  happenedAt: string;
}

export interface PerformanceSummary {
  routeCount: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  averageLatencyMs: number;
  recentRequests: RecentRequestRecord[];
}

export interface PerformanceRouteMetric {
  method: string;
  path: string;
  count: number;
  errorCount: number;
  errorRate: number;
  averageLatencyMs: number;
  maxLatencyMs: number;
  p95LatencyMs: number;
  lastStatusCode: number;
  lastCalledAt: string;
}

interface RouteBucket {
  method: string;
  path: string;
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastStatusCode: number;
  lastCalledAt: string;
  latencySamplesMs: number[];
}

@Injectable()
export class ApiPerformanceService {
  private readonly recentRequests: RecentRequestRecord[] = [];
  private readonly routeBuckets = new Map<string, RouteBucket>();

  recordRequest(record: { method: string; path: string; statusCode: number; durationMs: number }) {
    const normalized: RecentRequestRecord = {
      method: record.method,
      path: record.path,
      statusCode: record.statusCode,
      durationMs: Number(record.durationMs.toFixed(2)),
      happenedAt: new Date().toISOString()
    };

    this.recentRequests.unshift(normalized);
    if (this.recentRequests.length > MAX_RECENT_REQUESTS) {
      this.recentRequests.length = MAX_RECENT_REQUESTS;
    }

    const key = `${normalized.method} ${normalized.path}`;
    const existing = this.routeBuckets.get(key);

    if (!existing) {
      this.routeBuckets.set(key, {
        method: normalized.method,
        path: normalized.path,
        count: 1,
        errorCount: normalized.statusCode >= 400 ? 1 : 0,
        totalDurationMs: normalized.durationMs,
        maxDurationMs: normalized.durationMs,
        lastStatusCode: normalized.statusCode,
        lastCalledAt: normalized.happenedAt,
        latencySamplesMs: [normalized.durationMs]
      });
      return;
    }

    existing.count += 1;
    existing.errorCount += normalized.statusCode >= 400 ? 1 : 0;
    existing.totalDurationMs += normalized.durationMs;
    existing.maxDurationMs = Math.max(existing.maxDurationMs, normalized.durationMs);
    existing.lastStatusCode = normalized.statusCode;
    existing.lastCalledAt = normalized.happenedAt;
    existing.latencySamplesMs.unshift(normalized.durationMs);

    if (existing.latencySamplesMs.length > MAX_ROUTE_LATENCY_SAMPLES) {
      existing.latencySamplesMs.length = MAX_ROUTE_LATENCY_SAMPLES;
    }
  }

  getSummary(): PerformanceSummary {
    const routeCount = this.routeBuckets.size;
    const totalRequests = Array.from(this.routeBuckets.values()).reduce((sum, bucket) => sum + bucket.count, 0);
    const totalErrors = Array.from(this.routeBuckets.values()).reduce((sum, bucket) => sum + bucket.errorCount, 0);
    const totalDurationMs = Array.from(this.routeBuckets.values()).reduce((sum, bucket) => sum + bucket.totalDurationMs, 0);

    return {
      routeCount,
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? Number(((totalErrors / totalRequests) * 100).toFixed(2)) : 0,
      averageLatencyMs: totalRequests > 0 ? Number((totalDurationMs / totalRequests).toFixed(2)) : 0,
      recentRequests: this.recentRequests.slice(0, 25)
    };
  }

  getRouteMetrics(): PerformanceRouteMetric[] {
    return Array.from(this.routeBuckets.values())
      .map((bucket) => {
        const sorted = [...bucket.latencySamplesMs].sort((a, b) => a - b);
        const p95Index = sorted.length === 0 ? 0 : Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));
        const p95Sample = sorted[p95Index] ?? 0;
        const p95LatencyMs = Number(p95Sample.toFixed(2));

        return {
          method: bucket.method,
          path: bucket.path,
          count: bucket.count,
          errorCount: bucket.errorCount,
          errorRate: bucket.count > 0 ? Number(((bucket.errorCount / bucket.count) * 100).toFixed(2)) : 0,
          averageLatencyMs: bucket.count > 0 ? Number((bucket.totalDurationMs / bucket.count).toFixed(2)) : 0,
          maxLatencyMs: Number(bucket.maxDurationMs.toFixed(2)),
          p95LatencyMs,
          lastStatusCode: bucket.lastStatusCode,
          lastCalledAt: bucket.lastCalledAt
        };
      })
      .sort((a, b) => b.averageLatencyMs - a.averageLatencyMs);
  }
}
