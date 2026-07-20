import { Module } from "@nestjs/common";
import { MilestonesModule } from "src/modules/milestones/milestones.module";
import { PaymentsController } from "src/modules/payments/payments.controller";
import { PaymentsService } from "src/modules/payments/payments.service";

@Module({
  imports: [MilestonesModule],
  controllers: [PaymentsController],
  providers: [PaymentsService]
})
export class PaymentsModule {}
