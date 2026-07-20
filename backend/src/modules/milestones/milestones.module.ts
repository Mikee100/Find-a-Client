import { Module } from "@nestjs/common";
import { MilestonesController } from "src/modules/milestones/milestones.controller";
import { MilestonesService } from "src/modules/milestones/milestones.service";
import { NotificationsModule } from "src/modules/notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [MilestonesController],
  providers: [MilestonesService],
  exports: [MilestonesService]
})
export class MilestonesModule {}
