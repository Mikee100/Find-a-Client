import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CacheService } from "src/common/cache/cache.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheModule {}
