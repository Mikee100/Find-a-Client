import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { performance } from "node:perf_hooks";
import { Observable, tap } from "rxjs";
import { ApiPerformanceService } from "src/common/performance/api-performance.service";

@Injectable()
export class ApiPerformanceInterceptor implements NestInterceptor {
  constructor(private readonly apiPerformanceService: ApiPerformanceService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ method: string; route?: { path?: string }; baseUrl?: string; path?: string }>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();

    const method = request.method ?? "UNKNOWN";
    const resolvedPath = request.route?.path
      ? `${request.baseUrl ?? ""}${request.route.path}`
      : (request.path ?? "unknown");

    if (resolvedPath.startsWith("/health")) {
      return next.handle();
    }

    const startedAt = performance.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.apiPerformanceService.recordRequest({
            method,
            path: resolvedPath,
            statusCode: response.statusCode ?? 200,
            durationMs: performance.now() - startedAt
          });
        },
        error: () => {
          this.apiPerformanceService.recordRequest({
            method,
            path: resolvedPath,
            statusCode: response.statusCode ?? 500,
            durationMs: performance.now() - startedAt
          });
        }
      })
    );
  }
}
