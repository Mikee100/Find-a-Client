import { Global, Module } from "@nestjs/common";
import { ApiPerformanceService } from "src/common/performance/api-performance.service";

@Global()
@Module({
  providers: [ApiPerformanceService],
  exports: [ApiPerformanceService]
})
export class PerformanceModule {}
