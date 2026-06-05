import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { CurrentUser, CurrentUserPayload } from "src/common/decorators/current-user.decorator";
import { Roles } from "src/common/decorators/roles.decorator";
import { CreateReviewDto } from "src/modules/reviews/dto/create-review.dto";
import { ReviewsService } from "src/modules/reviews/reviews.service";

@Controller("projects/:slug/reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(UserRole.CLIENT)
  create(@Param("slug") slug: string, @CurrentUser() user: CurrentUserPayload, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(slug, user.sub, user.role as UserRole, dto);
  }

  @Get()
  list(@Param("slug") slug: string) {
    return this.reviewsService.list(slug);
  }
}
