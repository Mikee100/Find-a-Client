import { Module } from "@nestjs/common";
import { AdminController } from "src/modules/admin/admin.controller";
import { AdminService } from "src/modules/admin/admin.service";
import { MilestonesModule } from "src/modules/milestones/milestones.module";

@Module({
  imports: [MilestonesModule],
  controllers: [AdminController],
  providers: [AdminService]
})
export class AdminModule {}
