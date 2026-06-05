import { Module } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { AdminController } from "src/modules/admin/admin.controller";
import { AdminService } from "src/modules/admin/admin.service";

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService]
})
export class AdminModule {}
