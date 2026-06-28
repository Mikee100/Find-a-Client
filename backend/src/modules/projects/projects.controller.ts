import { Body, Controller, Delete, Get, Param, Post, Put, Query } from "@nestjs/common";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { Public } from "src/common/decorators/public.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { CreateQuestionDto } from "src/modules/questions/dto/create-question.dto";
import { QuestionsService } from "src/modules/questions/questions.service";
import { CreateProjectInquiryDto } from "src/modules/projects/dto/create-project-inquiry.dto";
import { CreateProjectDto } from "src/modules/projects/dto/create-project.dto";
import { ListProjectsDto } from "src/modules/projects/dto/list-projects.dto";
import { UpdateProjectDto } from "src/modules/projects/dto/update-project.dto";
import { ProjectsService } from "src/modules/projects/projects.service";

@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly questionsService: QuestionsService
  ) {}

  @Roles(USER_ROLE.DEVELOPER)
  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(user.sub, user.role as UserRole, dto);
  }

  @Public()
  @Get()
  list(@Query() query: ListProjectsDto) {
    return this.projectsService.list(query);
  }

  @Roles(USER_ROLE.ADMIN)
  @Get("admin/list")
  listForAdmin(@Query() query: ListProjectsDto, @Query("rankingDebug") rankingDebug?: string) {
    const includeRankingDebug = rankingDebug === "true" || rankingDebug === "1";
    return this.projectsService.list(query, { includeRankingDebug });
  }

  @Public()
  @Get(":slug")
  getOne(@Param("slug") slug: string, @Query("trackView") trackView?: string) {
    const shouldTrackView = trackView !== "false";
    return this.projectsService.getBySlug(slug, { trackView: shouldTrackView });
  }

  @Put(":slug")
  update(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProjectDto) {
    return this.projectsService.update(slug, user.sub, dto);
  }

  @Delete(":slug")
  delete(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.archive(slug, user.sub);
  }

  @Post(":slug/like")
  like(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.toggleLike(slug, user.sub);
  }

  @Get(":slug/like-status")
  likeStatus(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.getLikeStatus(slug, user.sub);
  }

  @Post(":slug/save")
  save(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload) {
    return this.projectsService.toggleSave(slug, user.sub);
  }

  @Post(":slug/inquiry")
  inquiry(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProjectInquiryDto) {
    return this.projectsService.trackInquiry(slug, user.sub, dto);
  }

  @Get(":slug/questions")
  questions(@Param("slug") slug: string) {
    return this.questionsService.listByProjectSlug(slug);
  }

  @Post(":slug/questions")
  askQuestion(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: CreateQuestionDto) {
    return this.questionsService.create(slug, user.sub, dto.content);
  }
}
