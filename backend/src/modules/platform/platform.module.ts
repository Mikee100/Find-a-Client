import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from 'src/common/cache/cache.module';
import { PrismaModule } from 'src/prisma/prisma.module';

// Blueprint
import { BlueprintService } from './blueprints/blueprint.service';

// Engines
import { PricingEngine } from './engines/pricing.engine';
import { InventoryEngine } from './engines/inventory.engine';
import { TaxEngine } from './engines/tax.engine';
import { SalesEngine } from './engines/sales.engine';

// Entity CRUD
import { EntityService } from './entities/entity.service';
import { EntityController } from './entities/entity.controller';

/**
 * Platform Module — the core of the Adeera Business OS.
 *
 * Exports:
 *   - BlueprintService: resolves tenant blueprints and capabilities
 *   - SalesEngine: the sale commit orchestrator
 *   - InventoryEngine: stock management
 *   - PricingEngine: price calculation
 *   - TaxEngine: tax calculation
 *
 * All other modules that need to commit a sale, check inventory,
 * or resolve a blueprint should import PlatformModule and inject
 * the relevant engine directly.
 */
@Module({
  imports: [
    PrismaModule,
    CacheModule,
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
  ],
  providers: [
    // Blueprint registry
    BlueprintService,

    // Platform engines
    PricingEngine,
    InventoryEngine,
    TaxEngine,
    SalesEngine,

    // Entity CRUD
    EntityService,
  ],
  controllers: [EntityController],
  exports: [
    BlueprintService,
    SalesEngine,
    InventoryEngine,
    PricingEngine,
    TaxEngine,
    EntityService,
  ],
})
export class PlatformModule {}
