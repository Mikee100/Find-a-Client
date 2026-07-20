import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { CreateMilestoneDto } from "src/modules/milestones/dto/create-milestone.dto";
import { CreateDisputeDto } from "src/modules/milestones/dto/create-dispute.dto";
import { FundMilestoneDto } from "src/modules/milestones/dto/fund-milestone.dto";
import { ReleaseMilestoneDto } from "src/modules/milestones/dto/release-milestone.dto";
import { SubmitMilestoneDto } from "src/modules/milestones/dto/submit-milestone.dto";
import { MilestonesService } from "src/modules/milestones/milestones.service";

@Controller()
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Post("hire-requests/:id/milestones")
  createForHireRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") hireRequestId: string,
    @Body() dto: CreateMilestoneDto
  ) {
    return this.milestonesService.createForHireRequest(user.sub, user.role, hireRequestId, dto);
  }

  @Post("milestones/:id/fund")
  fund(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") milestoneId: string,
    @Body() dto: FundMilestoneDto,
    @Headers("x-idempotency-key") idempotencyKey?: string
  ) {
    return this.milestonesService.fund(user.sub, user.role, milestoneId, dto, idempotencyKey);
  }

  @Post("milestones/:id/submit")
  submit(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") milestoneId: string,
    @Body() dto: SubmitMilestoneDto
  ) {
    return this.milestonesService.submit(user.sub, user.role, milestoneId, dto);
  }

  @Post("milestones/:id/release")
  release(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") milestoneId: string,
    @Body() dto: ReleaseMilestoneDto,
    @Headers("x-idempotency-key") idempotencyKey?: string
  ) {
    return this.milestonesService.release(user.sub, user.role, milestoneId, dto, idempotencyKey);
  }

  @Post("milestones/:id/dispute")
  dispute(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") milestoneId: string,
    @Body() dto: CreateDisputeDto
  ) {
    return this.milestonesService.dispute(user.sub, user.role, milestoneId, dto);
  }

  @Get("developers/:id/payout-account/status")
  payoutStatus(@CurrentUser() user: CurrentUserPayload, @Param("id") developerId: string) {
    return this.milestonesService.getPayoutAccountStatus(user.sub, user.role, developerId);
  }

  @Get("hire-requests/:id/milestones")
  listForHireRequest(@CurrentUser() user: CurrentUserPayload, @Param("id") hireRequestId: string) {
    return this.milestonesService.listForHireRequest(user.sub, user.role, hireRequestId);
  }

  @Get("milestones/:id")
  getById(@CurrentUser() user: CurrentUserPayload, @Param("id") milestoneId: string) {
    return this.milestonesService.getById(user.sub, user.role, milestoneId);
  }

  @Get("milestones/:id/events")
  listEvents(@CurrentUser() user: CurrentUserPayload, @Param("id") milestoneId: string) {
    return this.milestonesService.listEvents(user.sub, user.role, milestoneId);
  }
}
