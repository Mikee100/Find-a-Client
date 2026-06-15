import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { map, Observable } from "rxjs";

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((payload: unknown) => {
        if (typeof payload === "object" && payload !== null && "success" in (payload as Record<string, unknown>)) {
          return payload;
        }
        return {
          success: true,
          data: payload
        };
      })
    );
  }
}
