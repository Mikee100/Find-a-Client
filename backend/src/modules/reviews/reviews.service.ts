import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { USER_ROLE, UserRole } from "src/common/constants/user-role.constant";
import { PrismaService } from "src/prisma/prisma.service";
import { sanitizeInput } from "src/common/utils/sanitize.util";
import { CreateReviewDto } from "src/modules/reviews/dto/create-review.dto";

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates one review per client per project.
   */
  async create(projectSlug: string, reviewerId: string, role: UserRole, dto: CreateReviewDto) {
    if (role !== USER_ROLE.CLIENT) {
      throw new ForbiddenException("Only clients can review");
    }

    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    const review = await this.prisma.review.create({
      data: {
        projectId: project.id,
        reviewerId,
        rating: dto.rating,
        comment: dto.comment ? sanitizeInput(dto.comment) : null
      }
    });

    return review;
  }

  /**
   * Lists reviews for a project.
   */
  async list(projectSlug: string) {
    const project = await this.prisma.project.findUnique({ where: { slug: projectSlug } });
    if (!project) {
      throw new NotFoundException("Project not found");
    }

    return this.prisma.review.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "desc" } });
  }
}
