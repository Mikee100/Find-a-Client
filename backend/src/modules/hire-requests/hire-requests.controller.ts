import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { UserRole } from "src/common/constants/user-role.constant";
import { CreateHireRequestDto } from "src/modules/hire-requests/dto/create-hire-request.dto";
import { ListHireRequestsDto } from "src/modules/hire-requests/dto/list-hire-requests.dto";
import { SubmitProposalDto } from "src/modules/hire-requests/dto/submit-proposal.dto";
import { UpdateHireRequestStatusDto } from "src/modules/hire-requests/dto/update-hire-request-status.dto";
import { HireRequestsService } from "src/modules/hire-requests/hire-requests.service";

@Controller("hire-requests")
export class HireRequestsController {
  constructor(private readonly hireRequestsService: HireRequestsService) {}

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateHireRequestDto) {
    return this.hireRequestsService.create(user.sub, user.role as UserRole, dto);
  }

  @Get()
  list(@CurrentUser() user: CurrentUserPayload, @Query() query: ListHireRequestsDto) {
    return this.hireRequestsService.list(user.sub, user.role as UserRole, query);
  }

  @Get(":id")
  getById(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.hireRequestsService.getById(user.sub, user.role as UserRole, id);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: UpdateHireRequestStatusDto
  ) {
    return this.hireRequestsService.updateStatus(user.sub, user.role as UserRole, id, dto);
  }

  @Patch(":id/proposal")
  submitProposal(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SubmitProposalDto
  ) {
    return this.hireRequestsService.submitProposal(user.sub, user.role as UserRole, id, dto);
  }
}
