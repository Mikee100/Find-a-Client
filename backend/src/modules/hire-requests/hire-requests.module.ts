import { Module } from "@nestjs/common";
import { HireRequestsController } from "src/modules/hire-requests/hire-requests.controller";
import { HireRequestsService } from "src/modules/hire-requests/hire-requests.service";
import { NotificationsModule } from "src/modules/notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  controllers: [HireRequestsController],
  providers: [HireRequestsService]
})
export class HireRequestsModule {}
