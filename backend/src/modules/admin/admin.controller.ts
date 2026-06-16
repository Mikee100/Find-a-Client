import { Body, Controller, Get, Param, Put } from "@nestjs/common";
import { USER_ROLE } from "src/common/constants/user-role.constant";
import { Roles } from "src/common/decorators/roles.decorator";
import { AdminService } from "src/modules/admin/admin.service";

@Controller("admin")
@Roles(USER_ROLE.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("moderation")
  moderation() {
    return this.adminService.moderationQueue();
  }

  @Put("projects/:id/featured")
  setFeatured(@Param("id") id: string, @Body("isFeatured") isFeatured: boolean) {
    return this.adminService.setFeatured(id, isFeatured);
  }
}
