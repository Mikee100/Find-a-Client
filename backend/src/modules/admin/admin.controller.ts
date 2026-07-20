import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { USER_ROLE } from "src/common/constants/user-role.constant";
import { Roles } from "src/common/decorators/roles.decorator";
import { UpdateUserAccessDto } from "src/modules/admin/dto/update-user-access.dto";
import { UpdateUserPasswordDto } from "src/modules/admin/dto/update-user-password.dto";
import { UpdateUserRoleDto } from "src/modules/admin/dto/update-user-role.dto";
import { UpdateUserVerificationDto } from "src/modules/admin/dto/update-user-verification.dto";
import { AdminService } from "src/modules/admin/admin.service";
import { ResolveDisputeDto } from "src/modules/milestones/dto/resolve-dispute.dto";
import { MilestonesService } from "src/modules/milestones/milestones.service";

@Controller("admin")
@Roles(USER_ROLE.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly milestonesService: MilestonesService
  ) {}

  @Get("users")
  usersOverview() {
    return this.adminService.usersOverview();
  }

  @Get("performance/summary")
  performanceSummary() {
    return this.adminService.performanceSummary();
  }

  @Get("performance/routes")
  performanceRoutes() {
    return this.adminService.performanceRoutes();
  }

  @Get("users/:id")
  userDetails(@Param("id") id: string) {
    return this.adminService.userDetails(id);
  }

  @Patch("users/:id/access")
  setUserAccess(@Param("id") id: string, @Body() dto: UpdateUserAccessDto) {
    return this.adminService.setUserAccess(id, dto);
  }

  @Patch("users/:id/password")
  setUserPassword(@Param("id") id: string, @Body() dto: UpdateUserPasswordDto) {
    return this.adminService.setUserPassword(id, dto);
  }

  @Patch("users/:id/role")
  setUserRole(@Param("id") id: string, @Body() dto: UpdateUserRoleDto) {
    return this.adminService.setUserRole(id, dto);
  }

  @Patch("users/:id/verification")
  setUserVerification(@Param("id") id: string, @Body() dto: UpdateUserVerificationDto) {
    return this.adminService.setUserVerification(id, dto);
  }

  @Delete("users/:id")
  deleteUser(@Param("id") id: string, @CurrentUser() currentUser: CurrentUserPayload) {
    return this.adminService.deleteUser(id, currentUser.sub);
  }

  @Get("moderation")
  moderation() {
    return this.adminService.moderationQueue();
  }

  @Put("projects/:id/featured")
  setFeatured(@Param("id") id: string, @Body("isFeatured") isFeatured: boolean) {
    return this.adminService.setFeatured(id, isFeatured);
  }

  @Post("disputes/:id/resolve")
  resolveDispute(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Param("id") disputeId: string,
    @Body() dto: ResolveDisputeDto,
    @Headers("x-idempotency-key") idempotencyKey?: string
  ) {
    return this.milestonesService.resolveDispute(currentUser.sub, disputeId, dto, idempotencyKey);
  }
}
